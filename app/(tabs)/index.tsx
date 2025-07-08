import mqtt from 'mqtt';
import { Text, View } from '@/components/Themed';
import React, { useState, useEffect, act } from 'react';
import TrapezoidWaterTank from '@/components/TrapezoidWaterTank';
import { StyleSheet, TextInput, Button, Alert, TouchableOpacity } from 'react-native';
import {
  Switch,
  ScrollView,
  StatusBar,
  Dimensions,
} from 'react-native';

type Body = {
  comando: number,
  centimetros: number,
  origem: "ESP" | "APP",
  statusSolenoide: number,
}

export default function TabOneScreen() {
  const [client, setClient] = useState<any>(null);
  const [volumeTotal, setVolumeTotal] = useState(0);
  const [volumeAtual, setVolumeAtual] = useState(0);
  const [porcentagemAgua, setPorcentagemAgua] = useState(0);
  const [codigoStatusSolenoide, setCodigoStatusSolenoide] = useState(0); //0 - fechada, 1 - ligada
  const [statusVolume, setStatusVolume] = useState<'ALERTA' | 'OK' | 'PERIGO'>('ALERTA');

  const [status, setStatus] = useState('idle');
  const [waterLevel, setWaterLevel] = useState(45);
  const [isAutoMode, setIsAutoMode] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const autoConfig = {
    minLevel: 20,
    maxLevel: 90,
  };

  useEffect(() => {
    // Substitua com seus dados do HiveMQ Cloud:
    const brokerUrl = 'wss://1513bd8554204d70ace5ca47bae8225b.s1.eu.hivemq.cloud:8884/mqtt'; // ou porta 8884 wss
    const options = {
      username: "hydrosmartapp",
      password: "Hydrosmartapp01",
      reconnectPeriod: 1000,
    };

    const mqttClient = mqtt.connect(brokerUrl, options);

    mqttClient.on('connect', () => {
      console.log('Conectado ao HiveMQ!');
      mqttClient.subscribe('topico-esp23-app-comunicacao-nivel', (err) => {
      if (err) console.error('Erro ao inscrever:', err);
      else console.log('Inscrito no tópico');
      });
    });

    mqttClient.on('message', (topic, message) => {
      if (topic === 'topico-esp23-app-comunicacao-nivel') {
        const body = message.toString();
        atualizarStatusVolume(body);
      }
    });

    mqttClient.on('error', (err) => {
      console.error('Erro ao conectar ao HiveMQ:', err);
    });

    setClient(mqttClient);
    setVolumeTotal(calcularVolumeBalde(0))
    return () => {
      mqttClient.end();
    };
  }, []);

  const atualizarStatusVolume = (body: string) => {
    const bodyJson: Body = JSON.parse(body);
    const { centimetros, origem, statusSolenoide } = bodyJson;

    if(origem == "ESP"){
      console.log(body)
      const volumeTotalAtualizado = calcularVolumeBalde(0);
      const volumeAtual = calcularVolumeBalde(centimetros);
      const porcentagem = (volumeAtual * 100) / volumeTotalAtualizado;
      console.log({volumeAtual, volumeTotalAtualizado, porcentagem})
      setPorcentagemAgua(porcentagem)
      setVolumeAtual(volumeAtual)
      definirStatus(porcentagem)
      setVolumeTotal(volumeTotalAtualizado)
      setCodigoStatusSolenoide(statusSolenoide)
    }
  } 

  const definirStatus = (porcentagem: number): void => {
    if(porcentagem <= 10.0 || porcentagem >= 90.0){
      setStatusVolume("PERIGO")
      return;
    }

    if(porcentagem > 10.0 && porcentagem <= 35.0){
      setStatusVolume("ALERTA")
      return;
    }

    if(porcentagem > 35.0 && porcentagem < 90){
      setStatusVolume("OK");
      return;
    }
  }

  const definirCor = (): string => {
    if(statusVolume == 'OK'){
      return '#19b2e6';
    }

    if(statusVolume == 'ALERTA'){
      return '#e7e361'
    }

    return '#ce5d5d'
  }

  const calcularVolumeBalde = (altura: number): number => {
  const pi = Math.PI;
  const r1 = 24.3 / 2.0; // raio da base em cm
  const r2 = 29.3 / 2.0; // raio da boca em cm
  const hFixada = 31.9; // altura em cm
  const h = hFixada - altura; // altura em cm

  const volume = (pi * h / 3) * (r1 ** 2 + r1 * r2 + r2 ** 2);
  return volume / 1000; // volume em cm³
}

  const enviarMensagem = (mensagem: string) => {
    console.log("enviar mensagem")

    if (client && client.connected) {
      client.publish('topico-esp23-app-comunicacao-nivel', mensagem);
      Alert.alert('Mensagem enviada', mensagem);

    } else {
      console.log("Erro")
      Alert.alert('Erro', 'Não conectado ao broker MQTT.');
    }
  };

  const abrirSolenoide = (): void => {
    const body = {
        centimetros: 0,
        origem:  "APP",
        statusSolenoide: 0,
        comando: 1
    } as Body
    
    enviarMensagem(JSON.stringify(body))
  }

  const fecharSolenoide = (): void => {
    const body = {
        centimetros: 0,
        origem:  "APP",
        statusSolenoide: 0,
        comando: 0
    } as Body
    
    enviarMensagem(JSON.stringify(body))
  }

const handleAutoMode = (value: boolean) => {
    setIsAutoMode(value);
    if (value) {
      setStatus('idle');
    }
  };

  const handleFill = () => {
    if (isAutoMode || waterLevel >= 100) return;
    
    setStatus('filling');
    const interval = setInterval(() => {
      setWaterLevel((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setStatus('idle');
          return 100;
        }
        return prev + 2;
      });
    }, 100);
  };

  const handleEmpty = () => {
    if (isAutoMode || waterLevel <= 0) return;
    
    setStatus('emptying');
    const interval = setInterval(() => {
      setWaterLevel((prev) => {
        if (prev <= 0) {
          clearInterval(interval);
          setStatus('idle');
          return 0;
        }
        return prev - 2;
      });
    }, 100);
  };

  // Auto mode logic
  useEffect(() => {
    if (isAutoMode && waterLevel <= autoConfig.minLevel && status === 'idle') {
      setStatus('filling');
      const interval = setInterval(() => {
        setWaterLevel((prev) => {
          if (prev >= autoConfig.maxLevel) {
            clearInterval(interval);
            setStatus('idle');
            return autoConfig.maxLevel;
          }
          return prev + 1;
        });
      }, 200);
    }
  }, [isAutoMode, waterLevel, status]);

const isOperating = status === 'filling' || status === 'emptying';

const getStatusText = () => {
    if (isAutoMode) {
      return 'Automático';
    }
    switch (status) {
      case 'filling':
        return 'Enchendo';
      case 'emptying':
        return 'Esvaziando';
      default:
        return 'Inativo';
    }
  };

  const getStatusColor = () => {
    if (isAutoMode) return '#3B82F6';

    const status = !!codigoStatusSolenoide ? 'ABERTA' : 'FECHADA';

    switch (status) {
      case 'ABERTA':
        return '#10B981';
      case 'FECHADA':
        return '#F59E0B';
      default:
        return '#6B7280';
    }
  };

  const historyData = [
    {
      id: 1,
      action: 'Enchimento automático',
      date: '06/07/2025',
      time: '14:30',
      level: '85%',
    },
    {
      id: 2,
      action: 'Esvaziamento manual',
      date: '06/07/2025',
      time: '10:15',
      level: '30%',
    },
    {
      id: 3,
      action: 'Enchimento manual',
      date: '05/07/2025',
      time: '16:45',
      level: '78%',
    },
    {
      id: 4,
      action: 'Manutenção do sistema',
      date: '05/07/2025',
      time: '09:00',
      level: '50%',
    },
  ];


  const ProgressBar = ({ value }: any) => (
    <View style={styles.progressContainer}>
      <View style={styles.progressBackground}>
        <View style={[styles.progressFill, { width: `${value}%` }]} />
      </View>
    </View>
  );

  const Badge = ({ children, color = '#6B7280' }: { children: any; color?: string }) => (
    <View style={[styles.badge, { backgroundColor: color }]}>
      <Text style={styles.badgeText}>{children}</Text>
    </View>
  );

  const Card = ({ children, style }: { children: any; style?: any }) => (
    <View style={[styles.card, style]}>{children}</View>
  );

  const Button = ({ onPress, disabled, children, variant = 'primary', style }: { onPress: () => void; disabled?: boolean; children: any; variant?: 'primary' | 'secondary'; style?: any }) => (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        variant === 'primary' ? styles.primaryButton : styles.secondaryButton,
        disabled && styles.disabledButton,
        style,
      ]}
    >
      <Text style={[
        styles.buttonText,
        variant === 'primary' ? styles.primaryButtonText : styles.secondaryButtonText,
        disabled && styles.disabledButtonText,
      ]}>
        {children}
      </Text>
    </TouchableOpacity>
  );

  const TabButton = ({ active, onPress, children }: { active: boolean; onPress: () => void; children: any }) => (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.tabButton, active && styles.activeTabButton]}
    >
      <Text style={[styles.tabButtonText, active && styles.activeTabButtonText]}>
        {children}
      </Text>
    </TouchableOpacity>
  );

  const renderDashboard = () => (
    <ScrollView style={styles.tabContent}>
      {/* Status Card */}
      <Card>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Status Solenoide</Text>
          <Badge color={getStatusColor()}>
            {!!codigoStatusSolenoide ? 'ABERTA' : 'FECHADA'}
          </Badge>
        </View>
        <View style={styles.cardContent}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Nível da Água</Text>
          </View>
          <ProgressBar value={Math.round(porcentagemAgua)} />
          <View style={styles.progressInfo}>
            <Text style={styles.progressText}>{Math.round(porcentagemAgua)}%</Text>
            <Text style={styles.progressText}>
              {Math.round(porcentagemAgua) > 80 ? "Alto" : Math.round(porcentagemAgua) > 40 ? "Médio" : "Baixo"}
            </Text>
          </View>
        </View>
      </Card>

      {/* Mode Selection */}
      <Card>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Modo de Operação</Text>
        </View>
        <View style={styles.cardContent}>
          <View style={styles.modeContainer}>
            <View style={styles.modeInfo}>
              <View>
                <Text style={styles.modeTitle}>
                  {isAutoMode ? "Modo Automático" : "Modo Manual"}
                </Text>
                <Text style={styles.modeDescription}>
                  {isAutoMode ? "Sistema gerencia automaticamente" : "Controle manual dos comandos"}
                </Text>
              </View>
            </View>
            <Switch
              value={isAutoMode}
              onValueChange={handleAutoMode}
              trackColor={{ false: '#D1D5DB', true: '#3B82F6' }}
              thumbColor={isAutoMode ? '#FFFFFF' : '#9CA3AF'}
            />
          </View>

          {isAutoMode && (
            <View style={styles.autoConfig}>
              <Text style={styles.autoConfigTitle}>Configuração Automática</Text>
              <View style={styles.configRow}>
                <Text style={styles.configLabel}>Nível mínimo:</Text>
                <Text style={styles.configValue}>{autoConfig.minLevel}%</Text>
              </View>
              <View style={styles.configRow}>
                <Text style={styles.configLabel}>Nível máximo:</Text>
                <Text style={styles.configValue}>{autoConfig.maxLevel}%</Text>
              </View>
              <Text style={styles.configNote}>
                O sistema encherá automaticamente quando atingir {autoConfig.minLevel}%
              </Text>
            </View>
          )}
        </View>
      </Card>

      {/* Control Buttons */}
      <Card>
          <Text style={styles.cardTitle}>Controles Manuais</Text>
          <Text style={styles.cardDescription}>
            {isAutoMode ? "Controles desabilitados no modo automático" : "Gerencie o nível da caixa d'água"}
          </Text>

        <View style={styles.cardContent}>
          <Button
            onPress={abrirSolenoide}
            disabled={isOperating || waterLevel >= 100 || isAutoMode}
            style={styles.fillButton}
          >
          {status === "filling" ? "Enchendo..." : "Ligar"}
          </Button>

          <Button
            onPress={fecharSolenoide}
            disabled={isOperating || waterLevel <= 0 || isAutoMode}
            variant="secondary"
            style={styles.emptyButton}
          >
          {status === "emptying" ? "Esvaziando..." : "Desligar"}
          </Button>

          {isAutoMode && (
            <View style={styles.autoModeIndicator}>
              <Text style={styles.autoModeText}>
                ⚡ Modo automático ativo
              </Text>
            </View>
          )}
        </View>
      </Card>

      {/* Alerts */}
      {waterLevel < 20 && (
        <Card style={styles.alertCard}>
          <View style={styles.alertContent}>
            <Text style={styles.alertIcon}>⚠️</Text>
            <View>
              <Text style={styles.alertTitle}>Nível Baixo</Text>
              <Text style={styles.alertDescription}>Considere encher a caixa d'água</Text>
            </View>
          </View>
        </Card>
      )}
    </ScrollView>
  );

  const renderHistory = () => (
    <ScrollView style={styles.tabContent}>
      <Card>
          <Text style={styles.cardTitle}>🕐 Histórico de Operações</Text>
          <Text style={styles.cardDescription}>Últimas atividades da caixa d'água</Text>

        <View style={styles.cardContent}>
          {historyData.map((item) => (
            <View key={item.id} style={styles.historyItem}>
              <View style={styles.historyLeft}>
                <Text style={styles.historyIcon}>✅</Text>
                <View>
                  <Text style={styles.historyAction}>{item.action}</Text>
                  <Text style={styles.historyDate}>
                    {item.date} às {item.time}
                  </Text>
                </View>
              </View>
              <View style={styles.historyRight}>
                <Text style={styles.historyLevel}>{item.level}</Text>
                <Badge color="#10B981">Concluído</Badge>
              </View>
            </View>
          ))}
        </View>
      </Card>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#EFF6FF" />

      <View style={styles.header}>
        <Text style={styles.title}>HydroSmart</Text>
        <Text style={styles.subtitle}>Controle de Caixa D'Água</Text>
      </View>

      <View style={styles.tabs}>
        <TabButton
          active={activeTab === 'dashboard'}
          onPress={() => setActiveTab('dashboard')}
        >
          Dashboard
        </TabButton>
      </View>

      {activeTab === 'dashboard' ? renderDashboard() : renderHistory()}
    </View>
        /* <View>
            <View style={styles.containerTitle}>
              <Text style={styles.textTitle}>Status Solenoide: {!!codigoStatusSolenoide ? 'ABERTA' : 'FECHADA'}</Text>
            </View>
        </View>

        <View style={styles.containerTank}>
          <Text>{Math.round(porcentagemAgua)}% da capacidade - {Math.round(volumeTotal)} L total - {Math.round(volumeAtual)} L total</Text>
          <TrapezoidWaterTank 
            percentage={porcentagemAgua}
            waterColor={definirCor()}
            key={1}
          />
        </View>

        <View style={styles.containerButton}>
            <TouchableOpacity style={[styles.buttonBase, styles.buttonEnable]} onPress={abrirSolenoide}>
              <Text style={styles.textButton}>Abrir Solenoide</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.buttonBase, , styles.buttonDisable]} onPress={fecharSolenoide}>
              <Text style={styles.textButton}>Fechar Solenoide</Text>
            </TouchableOpacity>
        </View> */
  );
}

const styles = StyleSheet.create({
  // container: {
  //   flex: 1,
  //   alignItems: 'center',
  //   justifyContent: 'center',
  //   padding: 10,
  //   backgroundColor: '#f6f1f1'
  // },

  // title: {
  //   fontSize: 20,
  //   fontWeight: 'bold',
  //   marginBottom: 5,
  // },

  containerContent: {
    backgroundColor: '#ffffff',
    width: '100%',
    height: '100%',
    borderRadius: 20,
    padding: 10,
    justifyContent: 'center',
  },

  containerTank: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },

  containerButton: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-around',
    flexDirection: 'row',
    height: 60
  },

  buttonBase: {
    width: '40%',
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10
  },

  buttonDisable: {
    backgroundColor: '#ce5d5d'
  },
  buttonEnable: {
    backgroundColor: '#5dcea6'
  },
  textButton: {
    color: '#ffff',
    fontWeight: '800',
    fontSize: 15
  },
  textTitle: {
    color: '#f6f1f1',
    fontWeight: '800',
    fontSize: 15
  },
  containerTitle: {
    padding: 10,
    width: '40%',
    borderRadius: 12,
    alignContent: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#5dcea6'
  },
 container: {
    flex: 1,
    paddingTop: 50,
    paddingHorizontal: 16,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 4,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTabButton: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeTabButtonText: {
    color: '#111827',
  },
  tabContent: {
    flex: 1,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  cardDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
    marginBottom: 8,
  },
  cardContent: {
    marginTop: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  infoValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  progressContainer: {
    marginVertical: 8,
  },
  progressBackground: {
    height: 12,
    backgroundColor: '#E5E7EB',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 6,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#6B7280',
  },
  infoGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  infoCard: {
    flex: 1,
    marginRight: 8,
  },
  modeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 12,
  },
  modeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modeIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  modeTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  modeDescription: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  autoConfig: {
    padding: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  autoConfigTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1E40AF',
    marginBottom: 8,
  },
  configRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  configLabel: {
    fontSize: 12,
    color: '#1D4ED8',
  },
  configValue: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1E40AF',
  },
  configNote: {
    fontSize: 10,
    color: '#2563EB',
    marginTop: 8,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  primaryButton: {
    backgroundColor: '#2563EB',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#F97316',
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  primaryButtonText: {
    color: '#FFFFFF',
  },
  secondaryButtonText: {
    color: '#EA580C',
  },
  disabledButtonText: {
    color: '#9CA3AF',
  },
  fillButton: {
    backgroundColor: '#2563EB',
  },
  emptyButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#F97316',
  },
  autoModeIndicator: {
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    marginTop: 8,
  },
  autoModeText: {
    fontSize: 14,
    color: '#1D4ED8',
  },
  alertCard: {
    borderColor: '#FED7AA',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
  },
  alertContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#9A3412',
  },
  alertDescription: {
    fontSize: 14,
    color: '#EA580C',
    marginTop: 2,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 8,
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  historyIcon: {
    fontSize: 16,
    marginRight: 12,
  },
  historyAction: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  historyDate: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  historyRight: {
    alignItems: 'flex-end',
  },
  historyLevel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
});

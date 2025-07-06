import React, { useState, useEffect } from 'react';
import { StyleSheet, TextInput, Button, Alert, TouchableOpacity } from 'react-native';
import { Text, View } from '@/components/Themed';
import mqtt from 'mqtt';
import TrapezoidWaterTank from '@/components/TrapezoidWaterTank';

type Body = {
  centimetros: number,
  origem: "ESP" | "APP",
  statusSolenoide: number
}

export default function TabOneScreen() {
  const [mensagem, setMensagem] = useState('');
  const [volumeAtual, setVolumeAtual] = useState(0);
  const [porcentagemAgua, setPorcentagemAgua] = useState(0);
  const [volumeTotal, setVolumeTotal] = useState(0);
  const [statusVolume, setStatusVolume] = useState<'ALERTA' | 'OK' | 'PERIGO'>('ALERTA');
  const [codigoStatusSolenoide, setCodigoStatusSolenoide] = useState(0); //0 - fechada, 1 - ligada
  const [client, setClient] = useState<any>(null);

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
      const volumeAtual = calcularVolumeBalde(centimetros);
      const porcentagem = (volumeAtual * 100) / volumeTotal;
      setPorcentagemAgua(porcentagem)
      setVolumeAtual(volumeAtual)
      definirStatus(porcentagem)
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

  const enviarMensagem = () => {
    console.log("enviar mensagem")
    if (client && client.connected) {
      client.publish('topico-esp23-app-comunicacao-nivel', mensagem);
      Alert.alert('Mensagem enviada', mensagem);
      setMensagem('');
    } else {
      console.log("Erro")
      Alert.alert('Erro', 'Não conectado ao broker MQTT.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.containerContent}>
          <View>
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
            <TouchableOpacity style={[styles.buttonBase, styles.buttonEnable]} onPress={() => setVolumeAtual(volumeAtual + 5)}>
              <Text style={styles.textButton}>Abrir Solenoide</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.buttonBase, , styles.buttonDisable]} onPress={() => setVolumeAtual(volumeAtual - 5)}>
              <Text style={styles.textButton}>Fechar Solenoide</Text>
            </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    backgroundColor: '#f6f1f1'
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
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
  }
});

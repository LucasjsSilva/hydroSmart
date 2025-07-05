import React, { useState, useEffect } from 'react';
import { StyleSheet, TextInput, Button, Alert } from 'react-native';
import { Text, View } from '@/components/Themed';
import mqtt from 'mqtt';

type Body = {
  centimetros: number,
  origem: "ESP" | "APP",
  status: number
}

export default function TabOneScreen() {
  const [mensagem, setMensagem] = useState('');
  const [quantidadeAgua, setQuantidadeAgua] = useState(0);
  const [statusVolume, setStatusVolume] = useState<'ERROR' | 'OK'>('ERROR');
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

    return () => {
      mqttClient.end();
    };
  }, []);

  const atualizarStatusVolume = (body: string) => {
    const bodyJson: Body = JSON.parse(body);
    const { centimetros, origem, status } = bodyJson;
    const volume = calcularVolumeBalde(centimetros);
    const altura = 40;
    const tamanhoContainer = 250;
    const tamanhoReal = 50;
    const valorX: number = Math.round((tamanhoContainer * centimetros) / tamanhoReal);
    console.log(valorX)
    setQuantidadeAgua(valorX);
    if(valorX >= 50 && valorX <= 200){
      setStatusVolume("OK")
    }else{
      setStatusVolume("ERROR")
    }
  } 

  const calcularVolumeBalde = (altura: number): number => {
  const pi = Math.PI;
  const r1 = 15; // raio da base em cm
  const r2 = 20; // raio da boca em cm
  const h = altura; // altura em cm

  const volume = (pi * h / 3) * (r1 ** 2 + r1 * r2 + r2 ** 2);
  return volume; // volume em cm³
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
      <Text style={styles.title}>Trabalho Final hydro-smart.</Text>
      <Text>{quantidadeAgua}%</Text>
      <View style={styles.containerBoxWater}>
        <View style={styles.containerSideWall}>
          <View style={[styles.water, {height: quantidadeAgua, backgroundColor: (statusVolume == 'OK' ? '#0000CD' : '#d22')}]}></View>
        </View>
      </View>
      <TextInput
        style={styles.input}
        placeholder="Digite a mensagem para enviar"
        value={mensagem}
        onChangeText={setMensagem}
      />

      <View style={{width: '100%', justifyContent: 'space-around', flexDirection: 'row'}}>
        <Button title="Encher caixa" onPress={() => {
          let quantidadeRestante = quantidadeAgua + 25
          if(quantidadeRestante <= 250){
            setQuantidadeAgua(quantidadeRestante)
          }

          if(quantidadeAgua > 50 && quantidadeAgua < 200){
            setStatusVolume('OK')
          }else{
            setStatusVolume('ERROR')
          }
        }} />
        <Button title="Secar caixa" onPress={() => {
          let quantidadeRestante = quantidadeAgua - 25
          if(quantidadeRestante >= 0){
            setQuantidadeAgua(quantidadeRestante)
          }

           if(quantidadeAgua > 50 && quantidadeAgua < 200){
            setStatusVolume('OK')
          }else{
            setStatusVolume('ERROR')
          }
        }} />

      </View>
      {/* <Button title="Enviar para o ESP32" onPress={enviarMensagem} /> */}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#999',
    borderRadius: 8,
    padding: 10,
    width: '100%',
    marginBottom: 16,
  },
  containerBoxWater: {
    width: '100%',
    height: 300,
    justifyContent: 'center',
    alignItems: 'flex-end',
    flexDirection: 'row',
    borderTopLeftRadius: 20
  },
  containerSideWall: {
    width: 250,
    height: 250,
    borderBottomColor: '#000d00',
    borderBottomWidth: 4,
    borderLeftColor: '#000d00',
    borderLeftWidth: 4,
    borderRightColor: '#000d00',
    borderRightWidth: 4,
    justifyContent: 'flex-end',
    alignItems: 'flex-end'
  }, 
  water: {
    width: 242,
    backgroundColor: '#0000CD'
  }
});

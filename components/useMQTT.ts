// components/useMQTT.ts
import { useEffect, useRef, useState } from 'react';
import mqtt, { MqttClient } from 'mqtt';

// Interface para as mensagens
export interface MQTTMessage {
  id: string;
  topic: string;
  message: string;
  timestamp: Date;
  parsedData?: any;
}

const BROKER_URL = 'wss://broker.emqx.io:8084/mqtt';

export function useMQTT(topic: string, onMessage?: (message: string) => void) {
  const clientRef = useRef<MqttClient | null>(null);
  const [messages, setMessages] = useState<MQTTMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    console.log('🔄 Tentando conectar ao MQTT...');
    
    const client = mqtt.connect(BROKER_URL, {
      clientId: `react_native_${Math.random().toString(16).slice(3)}`,
      clean: true,
      connectTimeout: 4000,
      reconnectPeriod: 1000,
    });
    
    clientRef.current = client;

    client.on('connect', () => {
      console.log('🔌 Conectado ao MQTT');
      setIsConnected(true);
      client.subscribe(topic, (err) => {
        if (err) {
          console.error('❌ Erro ao subscrever:', err);
        } else {
          console.log(`✅ Subscrito ao tópico: ${topic}`);
        }
      });
    });

    client.on('message', (receivedTopic, message) => {
      const messageStr = message.toString();
      console.log('📨 Mensagem recebida:', messageStr);
      
      // Cria objeto da mensagem
      const mqttMessage: MQTTMessage = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        topic: receivedTopic,
        message: messageStr,
        timestamp: new Date(),
      };

      // Tenta fazer parse do JSON
      try {
        mqttMessage.parsedData = JSON.parse(messageStr);
      } catch (error) {
        // Não é JSON, mantém como string
      }

      // Adiciona à lista de mensagens
      setMessages(prev => [mqttMessage, ...prev]); // Mais recente primeiro
      
      // Chama callback se fornecido
      onMessage?.(messageStr);
    });

    client.on('error', (error) => {
      console.error('❌ Erro MQTT:', error);
      setIsConnected(false);
    });

    client.on('offline', () => {
      console.log('📡 MQTT offline');
      setIsConnected(false);
    });

    client.on('reconnect', () => {
      console.log('🔄 Reconnectando...');
    });

    return () => {
      console.log('🔌 Desconectando MQTT');
      client.end();
      setIsConnected(false);
    };
  }, [topic]);

  const publish = (message: string) => {
    if (clientRef.current?.connected) {
      clientRef.current.publish(topic, message);
      console.log(`📤 Mensagem enviada: ${message}`);
    } else {
      console.error('❌ Cliente MQTT não conectado');
    }
  };

  const clearHistory = () => {
    setMessages([]);
  };

  return { 
    publish, 
    messages, 
    isConnected, 
    clearHistory,
    messageCount: messages.length 
  };
}
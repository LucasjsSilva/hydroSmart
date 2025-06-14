import { useState } from 'react';
import { View, Text, Button, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useMQTT, MQTTMessage } from '../../components/useMQTT';

export default function TabThreeScreen() {
  const [lastMessage, setLastMessage] = useState('Aguardando dados...');
  const [showHistory, setShowHistory] = useState(false);
  const topic = 'esp32/teste';
 
  const { publish, messages, isConnected, clearHistory, messageCount } = useMQTT(
    topic, 
    (message) => {
      setLastMessage(message);
    }
  );

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    });
  };

  const renderMessage = (msg: MQTTMessage, index: number) => (
    <View key={msg.id} style={[styles.messageItem, index === 0 && styles.latestMessage]}>
      <View style={styles.messageHeader}>
        <Text style={styles.messageTime}>
          {formatTime(msg.timestamp)} - {formatDate(msg.timestamp)}
        </Text>
        {index === 0 && <Text style={styles.latestBadge}>📍 MAIS RECENTE</Text>}
      </View>
      
      <Text style={styles.messageContent}>{msg.message}</Text>
      
      {msg.parsedData && (
        <View style={styles.parsedDataContainer}>
          <Text style={styles.parsedDataTitle}>📊 Dados:</Text>
          {Object.entries(msg.parsedData).map(([key, value]) => (
            <Text key={key} style={styles.parsedDataItem}>
              • {key}: {typeof value === 'number' ? value.toFixed(1) : String(value)}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
 
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>ESP32 ↔️ React Native</Text>
        <View style={[styles.status, { backgroundColor: isConnected ? '#4CAF50' : '#f44336' }]}>
          <Text style={styles.statusText}>
            {isConnected ? '🟢 Conectado' : '🔴 Desconectado'}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📨 Última Mensagem:</Text>
        <Text style={styles.message}>{lastMessage}</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.historyHeader}>
          <Text style={styles.sectionTitle}>
            📋 Histórico ({messageCount} mensagens)
          </Text>
          <TouchableOpacity 
            style={styles.toggleButton}
            onPress={() => setShowHistory(!showHistory)}
          >
            <Text style={styles.toggleButtonText}>
              {showHistory ? '🔼 Ocultar' : '🔽 Mostrar'}
            </Text>
          </TouchableOpacity>
        </View>

        {showHistory && (
          <>
            <View style={styles.historyControls}>
              <Button 
                title="🗑️ Limpar Histórico" 
                onPress={clearHistory}
                color="#f44336"
              />
            </View>
            
            <ScrollView style={styles.historyContainer} nestedScrollEnabled>
              {messages.length === 0 ? (
                <Text style={styles.noMessages}>Nenhuma mensagem recebida ainda...</Text>
              ) : (
                messages.map((msg, index) => renderMessage(msg, index))
              )}
            </ScrollView>
          </>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎮 Controles:</Text>
        <View style={styles.buttonContainer}>
          <Button 
            title="👋 Dizer Oi" 
            onPress={() => publish('Oi do React Native')} 
            disabled={!isConnected}
          />
          <View style={styles.buttonSpacer} />
          <Button 
            title="🔄 Solicitar Dados" 
            onPress={() => publish('REQUEST_DATA')} 
            disabled={!isConnected}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 Estatísticas:</Text>
        <View style={styles.statsContainer}>
          <Text style={styles.statItem}>📈 Total de mensagens: {messageCount}</Text>
          <Text style={styles.statItem}>🔗 Status: {isConnected ? 'Conectado' : 'Desconectado'}</Text>
          <Text style={styles.statItem}>📡 Tópico: {topic}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  status: {
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusText: {
    color: 'white',
    fontWeight: 'bold',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  message: {
    fontSize: 16,
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 5,
    fontFamily: 'monospace',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  toggleButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 15,
  },
  toggleButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  historyControls: {
    marginBottom: 15,
  },
  historyContainer: {
    maxHeight: 400,
    backgroundColor: '#f9f9f9',
    borderRadius: 5,
    padding: 10,
  },
  messageItem: {
    backgroundColor: 'white',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#2196F3',
  },
  latestMessage: {
    borderLeftColor: '#4CAF50',
    backgroundColor: '#f0fff0',
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  messageTime: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
  latestBadge: {
    fontSize: 10,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  messageContent: {
    fontSize: 14,
    fontFamily: 'monospace',
    marginBottom: 5,
  },
  parsedDataContainer: {
    backgroundColor: '#f0f8ff',
    padding: 8,
    borderRadius: 4,
    marginTop: 5,
  },
  parsedDataTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  parsedDataItem: {
    fontSize: 11,
    color: '#333',
  },
  noMessages: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    padding: 20,
  },
  buttonContainer: {
    gap: 10,
  },
  buttonSpacer: {
    height: 10,
  },
  statsContainer: {
    gap: 5,
  },
  statItem: {
    fontSize: 14,
    color: '#666',
  },
});
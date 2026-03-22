import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { registerRootComponent } from 'expo';

function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Best Class Customer App</Text>
      <Text style={styles.sub}>If you can see this, the app is working!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0A1628' },
  text: { fontSize: 32, fontWeight: '700', color: '#C8A951' },
  sub: { fontSize: 14, color: 'rgba(255,255,255,0.5)', marginTop: 12 },
});

registerRootComponent(App);

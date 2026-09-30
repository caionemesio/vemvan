import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

export default function Home() {
  return (
    <View style={styles.container}>
      <Text style={styles.brand}>VemVan</Text>
      <Text style={styles.status}>O aplicativo está funcionando.</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    padding: 24,
  },
  brand: {
    fontSize: 32,
    fontWeight: '700',
    color: '#171717',
  },
  status: {
    marginTop: 8,
    fontSize: 16,
    color: '#525252',
  },
});

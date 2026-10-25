import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  BackHandler,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  StatusBar
} from 'react-native';
import { WebView } from 'react-native-webview';

export default function MobileApp() {
  const [currentUrl, setCurrentUrl] = useState('http://192.168.0.104:5174/');
  const [inputUrl, setInputUrl] = useState('http://192.168.0.104:5174/');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [showConfig, setShowConfig] = useState(false);
  const webViewRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);

  // Hardware back button support for Android
  useEffect(() => {
    const onBackPress = () => {
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      return false;
    };

    const backHandlerSubscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backHandlerSubscription.remove();
  }, [canGoBack]);

  const handleSaveUrl = () => {
    let formatted = inputUrl.trim();
    if (!formatted.startsWith('http://') && !formatted.startsWith('https://')) {
      formatted = 'http://' + formatted;
    }
    if (!formatted.endsWith('/')) {
      formatted += '/';
    }
    setCurrentUrl(formatted);
    setHasError(false);
    setErrorMessage('');
    setShowConfig(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#080c14" />

      {/* Floating config bar when requested */}
      {showConfig && (
        <View style={styles.configBar}>
          <Text style={styles.configTitle}>RentEasy Server Address</Text>
          <View style={styles.configRow}>
            <TextInput
              style={styles.configInput}
              value={inputUrl}
              onChangeText={setInputUrl}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="http://192.168.0.104:5174/"
              placeholderTextColor="#64748b"
            />
            <TouchableOpacity style={styles.configBtn} onPress={handleSaveUrl}>
              <Text style={styles.configBtnText}>Connect</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => setShowConfig(false)} style={{ alignSelf: 'flex-end', marginTop: 6 }}>
            <Text style={{ color: '#94a3b8', fontSize: 12 }}>Close</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Error / Offline Screen */}
      {hasError ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>📡</Text>
          <Text style={styles.errorTitle}>Cannot Connect to RentEasy</Text>
          <Text style={styles.errorSubtitle}>
            Unable to reach the server. Check your connection or enter an online server URL below.
          </Text>

          {errorMessage ? (
            <View style={styles.errorBadge}>
              <Text style={styles.errorCode}>Error: {errorMessage}</Text>
            </View>
          ) : null}

          <View style={styles.configBox}>
            <Text style={styles.configLabel}>Target Address (IP or HTTPS URL):</Text>
            <TextInput
              style={styles.configInput}
              value={inputUrl}
              onChangeText={setInputUrl}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="http://192.168.0.104:5174/"
              placeholderTextColor="#64748b"
            />
            <TouchableOpacity style={styles.retryBtn} onPress={handleSaveUrl}>
              <Text style={styles.retryBtnText}>Retry Connection</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.checklist}>
            <Text style={styles.checklistTitle}>Quick Checklist:</Text>
            <Text style={styles.checklistItem}>• Phone and PC must be on the same Wi-Fi</Text>
            <Text style={styles.checklistItem}>• Allow port 5174 through Windows Firewall</Text>
            <Text style={styles.checklistItem}>• Or host online (Vercel / Cloud) for 24/7 access</Text>
          </View>
        </View>
      ) : (
        <View style={styles.webViewContainer}>
          <WebView
            ref={webViewRef}
            source={{ uri: currentUrl }}
            style={styles.webView}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            mixedContentMode="always"
            allowsBackForwardNavigationGestures={true}
            originWhitelist={['*']}
            onNavigationStateChange={(navState) => {
              setCanGoBack(navState.canGoBack);
            }}
            onLoadStart={() => setIsLoading(true)}
            onLoadEnd={() => setIsLoading(false)}
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              setErrorMessage(nativeEvent.description || 'Connection failed or blocked');
              setIsLoading(false);
              setHasError(true);
            }}
          />

          {/* Subtle loading spinner overlay */}
          {isLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#6366f1" />
              <Text style={styles.loadingText}>Loading RentEasy...</Text>
            </View>
          )}

          {/* Subtle server IP switch button at bottom corner */}
          <TouchableOpacity
            style={styles.serverFloatingBtn}
            onPress={() => setShowConfig(!showConfig)}
          >
            <Text style={styles.serverFloatingBtnText}>⚙️</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080c14'
  },
  webViewContainer: {
    flex: 1,
    position: 'relative'
  },
  webView: {
    flex: 1,
    backgroundColor: '#080c14'
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8, 12, 20, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10
  },
  loadingText: {
    color: '#cbd5e1',
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600'
  },
  serverFloatingBtn: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20
  },
  serverFloatingBtnText: {
    fontSize: 16
  },
  configBar: {
    backgroundColor: '#111827',
    padding: 14,
    borderBottomWidth: 1,
    borderColor: '#1e293b'
  },
  configTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8
  },
  configRow: {
    flexDirection: 'row',
    gap: 8
  },
  configInput: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#fff',
    fontSize: 14
  },
  configBtn: {
    backgroundColor: '#6366f1',
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center'
  },
  configBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center'
  },
  errorSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20
  },
  configBox: {
    width: '100%',
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    gap: 12
  },
  configLabel: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600'
  },
  retryBtn: {
    backgroundColor: '#6366f1',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center'
  },
  retryBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14
  },
  errorBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 16
  },
  errorCode: {
    color: '#f87171',
    fontSize: 12,
    fontFamily: 'monospace',
    textAlign: 'center'
  },
  checklist: {
    marginTop: 20,
    width: '100%',
    padding: 12,
    backgroundColor: '#0f172a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e293b'
  },
  checklistTitle: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6
  },
  checklistItem: {
    color: '#94a3b8',
    fontSize: 11,
    lineHeight: 18
  }
});

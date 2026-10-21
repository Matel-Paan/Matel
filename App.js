import React, { useState, useEffect } from 'react';
import { Text, View, StyleSheet, TextInput, TouchableOpacity, ScrollView, SafeAreaView, Platform, StatusBar, ActivityIndicator, Alert } from 'react-native';
import { supabase } from './supabase'; 

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard'); // Tabs: 'dashboard', 'history', 'pay'
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [customerData, setCustomerData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [historyFilter, setHistoryFilter] = useState('ALL'); // ALL, UDHAR, JAMA

  // Pay Form States
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('UPI');
  const [payRef, setPayRef] = useState('');
  const [submittingPay, setSubmittingPay] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    supabase.auth.onAuthStateChange((_event, session) => setSession(session));
  }, []);

  useEffect(() => {
    if (session) fetchDashboardData();
  }, [session]);

  async function fetchDashboardData() {
    try {
      const { data: customer } = await supabase.from('customers').select('*').eq('profile_id', session.user.id).single();
      if (customer) {
        setCustomerData(customer);
        const { data: txs } = await supabase.from('ledger_transactions').select('*').eq('customer_id', customer.id).order('created_at', { ascending: false });
        if (txs) setTransactions(txs);
      }
    } catch (error) { console.log('Fetch error:', error); }
  }

  async function handleLogin() {
    if (!email || !password) return Alert.alert('Error', 'Enter email and password');
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) Alert.alert('Login Failed', error.message);
    setLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setCustomerData(null);
  }

  async function submitPaymentRequest() {
    if (!payAmount) return Alert.alert('Error', 'Please enter amount');
    setSubmittingPay(true);
    const { error } = await supabase.from('payment_requests').insert([{
      business_id: customerData.business_id,
      customer_id: customerData.id,
      amount: payAmount,
      payment_method: payMethod,
      reference_number: payRef
    }]);
    
    setSubmittingPay(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Success', 'Payment claim submitted for approval!');
      setPayAmount(''); setPayRef('');
      setActiveTab('dashboard'); // Wapas dashboard par bhej do
    }
  }

  // ================= UI: LOGIN =================
  if (!session) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.card}>
          <Text style={styles.title}>Digital Khata</Text>
          <Text style={styles.subtitle}>Smart Customer Portal</Text>
          <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#94a3b8" value={email} onChangeText={setEmail} autoCapitalize="none" />
          <TextInput style={styles.input} placeholder="Secret PIN" placeholderTextColor="#94a3b8" secureTextEntry={true} value={password} onChangeText={setPassword} />
          <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.buttonText}>Login Securely</Text>}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Filter Transactions for History Page
  const filteredTxs = transactions.filter(tx => historyFilter === 'ALL' || tx.transaction_type === historyFilter);

  // ================= UI: MAIN APP =================
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar backgroundColor="#ffffff" barStyle="dark-content" />
      
      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Digital Khata</Text>
          <Text style={styles.headerSubtitle}>{customerData?.full_name || 'Loading...'}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutBtnText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ padding: 16, marginBottom: 70 }} showsVerticalScrollIndicator={false}>
        
        {/* === TAB 1: DASHBOARD === */}
        {activeTab === 'dashboard' && (
          <View>
            <View style={styles.darkCard}>
              <Text style={styles.cardLabel}>TOTAL OUTSTANDING (UDHAR)</Text>
              <Text style={styles.outAmount}>₹ {customerData?.outstanding_balance || '0'}</Text>
              <View style={styles.cardBottom}>
                <Text style={styles.cardLabelSm}>TOTAL PAID (JAMA): ₹ {customerData?.total_jama || '0'}</Text>
                <TouchableOpacity style={styles.payBtnSm} onPress={() => setActiveTab('pay')}>
                  <Text style={styles.payBtnSmText}>Pay</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.actionBox} onPress={() => setActiveTab('history')}>
                <Text style={{fontSize: 20, marginBottom: 4}}>📄</Text><Text style={styles.actionTitle}>Passbook</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBox} onPress={() => setActiveTab('pay')}>
                <Text style={{fontSize: 20, marginBottom: 4}}>📱</Text><Text style={styles.actionTitle}>Submit Claim</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.recentTitle}>Recent Activity</Text>
            <View style={styles.transactionList}>
              {transactions.slice(0, 5).map((tx) => {
                const isJama = tx.transaction_type === 'JAMA';
                return (
                  <View key={tx.id} style={styles.txItem}>
                    <View><Text style={styles.txName}>{isJama ? 'Payment Received' : 'Udhar / Credit'}</Text><Text style={styles.txDesc}>{tx.description}</Text></View>
                    <Text style={{fontWeight: 'bold', fontSize: 16, color: isJama ? '#10b981' : '#e11d48'}}>{isJama ? '-' : '+'}₹{tx.amount}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* === TAB 2: HISTORY (PASSBOOK) === */}
        {activeTab === 'history' && (
          <View>
            <View style={styles.filterRow}>
              <TouchableOpacity style={[styles.filterBtn, historyFilter === 'ALL' && styles.filterBtnActive]} onPress={() => setHistoryFilter('ALL')}>
                <Text style={[styles.filterText, historyFilter === 'ALL' && styles.filterTextActive]}>All</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.filterBtn, historyFilter === 'UDHAR' && styles.filterBtnActive]} onPress={() => setHistoryFilter('UDHAR')}>
                <Text style={[styles.filterText, historyFilter === 'UDHAR' && styles.filterTextActive]}>Udhar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.filterBtn, historyFilter === 'JAMA' && styles.filterBtnActive]} onPress={() => setHistoryFilter('JAMA')}>
                <Text style={[styles.filterText, historyFilter === 'JAMA' && styles.filterTextActive]}>Jama</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.transactionList}>
              {filteredTxs.map((tx) => {
                const isJama = tx.transaction_type === 'JAMA';
                return (
                  <View key={tx.id} style={styles.txItem}>
                    <View><Text style={styles.txName}>{isJama ? 'Payment Received' : 'Udhar / Credit'}</Text><Text style={styles.txDesc}>{tx.description}</Text></View>
                    <Text style={{fontWeight: 'bold', fontSize: 16, color: isJama ? '#10b981' : '#e11d48'}}>{isJama ? '-' : '+'}₹{tx.amount}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* === TAB 3: PAY (CLAIM) === */}
        {activeTab === 'pay' && (
          <View style={styles.payCard}>
            <Text style={{fontSize: 40, textAlign: 'center', marginBottom: 10}}>✅</Text>
            <Text style={styles.title}>Report a Payment</Text>
            <Text style={styles.subtitle}>Submit offline payment details</Text>

            <TextInput style={styles.inputLg} placeholder="Amount Paid (₹)" placeholderTextColor="#94a3b8" keyboardType="numeric" value={payAmount} onChangeText={setPayAmount} />
            
            {/* Simple method selector */}
            <View style={styles.methodRow}>
              <TouchableOpacity style={[styles.methodBtn, payMethod === 'UPI' && styles.methodBtnActive]} onPress={() => setPayMethod('UPI')}><Text style={styles.methodText}>UPI</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.methodBtn, payMethod === 'Cash' && styles.methodBtnActive]} onPress={() => setPayMethod('Cash')}><Text style={styles.methodText}>Cash</Text></TouchableOpacity>
            </View>

            <TextInput style={styles.input} placeholder="Reference / UTR (Optional)" placeholderTextColor="#94a3b8" value={payRef} onChangeText={setPayRef} />

            <TouchableOpacity style={styles.paySubmitBtn} onPress={submitPaymentRequest} disabled={submittingPay}>
              {submittingPay ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.buttonText}>Submit Claim</Text>}
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>

      {/* BOTTOM NAVIGATION */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('dashboard')}>
          <Text style={{fontSize: 22, opacity: activeTab === 'dashboard' ? 1 : 0.4}}>🏠</Text>
          <Text style={[styles.navText, activeTab === 'dashboard' && styles.navTextActive]}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('history')}>
          <Text style={{fontSize: 22, opacity: activeTab === 'history' ? 1 : 0.4}}>🧾</Text>
          <Text style={[styles.navText, activeTab === 'history' && styles.navTextActive]}>History</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('pay')}>
          <Text style={{fontSize: 22, opacity: activeTab === 'pay' ? 1 : 0.4}}>📳</Text>
          <Text style={[styles.navText, activeTab === 'pay' && {color: '#10b981'}]}>Pay</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', paddingTop: Platform.OS === 'android' ? 25 : 0 },
  centerContainer: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#f8fafc' },
  
  card: { backgroundColor: '#ffffff', padding: 28, borderRadius: 24, elevation: 5 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#0f172a', textAlign: 'center' },
  subtitle: { fontSize: 12, fontWeight: '600', color: '#64748b', textAlign: 'center', marginBottom: 24 },
  input: { backgroundColor: '#f1f5f9', padding: 16, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  inputLg: { backgroundColor: '#f1f5f9', padding: 20, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: '#10b981', fontSize: 24, fontWeight: 'bold', textAlign: 'center' },
  button: { backgroundColor: '#0f172a', padding: 18, borderRadius: 16, alignItems: 'center' },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },

  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, backgroundColor: '#ffffff', borderBottomWidth: 1, borderColor: '#f1f5f9' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b' },
  headerSubtitle: { fontSize: 10, color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase' },
  logoutBtn: { backgroundColor: '#fee2e2', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, justifyContent: 'center' },
  logoutBtnText: { color: '#ef4444', fontWeight: 'bold', fontSize: 12 },

  darkCard: { backgroundColor: '#0f172a', borderRadius: 32, padding: 24, marginBottom: 20, elevation: 8 },
  cardLabel: { color: '#94a3b8', fontSize: 11, fontWeight: 'bold', letterSpacing: 1 },
  outAmount: { color: '#ffffff', fontSize: 40, fontWeight: 'bold', marginVertical: 8 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.1)', paddingTop: 16, marginTop: 10 },
  cardLabelSm: { color: '#34d399', fontSize: 12, fontWeight: 'bold' },
  payBtnSm: { backgroundColor: '#0ea5e9', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  payBtnSmText: { color: '#fff', fontWeight: 'bold' },

  actionRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  actionBox: { flex: 1, backgroundColor: '#ffffff', padding: 16, borderRadius: 20, marginHorizontal: 4, alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9', elevation: 2 },
  actionTitle: { fontSize: 14, fontWeight: 'bold', color: '#1e293b' },

  recentTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginBottom: 12, marginLeft: 4 },
  transactionList: { backgroundColor: '#ffffff', borderRadius: 24, padding: 8, elevation: 2, borderWidth: 1, borderColor: '#f1f5f9' },
  txItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: '#f8fafc' },
  txName: { fontSize: 14, fontWeight: 'bold', color: '#1e293b' },
  txDesc: { fontSize: 12, color: '#64748b', marginTop: 2 },

  filterRow: { flexDirection: 'row', marginBottom: 16, gap: 8 },
  filterBtn: { flex: 1, padding: 12, backgroundColor: '#ffffff', borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  filterBtnActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
  filterText: { fontWeight: 'bold', color: '#64748b' },
  filterTextActive: { color: '#ffffff' },

  payCard: { backgroundColor: '#ffffff', padding: 24, borderRadius: 24, elevation: 5, borderWidth: 1, borderColor: '#ecfdf5' },
  methodRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  methodBtn: { flex: 1, padding: 14, backgroundColor: '#f8fafc', borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  methodBtnActive: { backgroundColor: '#ecfdf5', borderColor: '#10b981' },
  methodText: { fontWeight: 'bold', color: '#0f172a' },
  paySubmitBtn: { backgroundColor: '#10b981', padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 10 },

  bottomNav: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#ffffff', flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 12, borderTopWidth: 1, borderColor: '#f1f5f9', elevation: 15 },
  navItem: { alignItems: 'center', justifyContent: 'center', width: 60 },
  navText: { fontSize: 10, fontWeight: 'bold', color: '#94a3b8', marginTop: 4 },
  navTextActive: { color: '#0ea5e9' }
});

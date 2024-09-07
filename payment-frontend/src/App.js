import React, { useState, useEffect } from 'react';
import { AptosClient } from 'aptos';
import { PetraWallet } from 'petra-plugin-wallet-adapter';
import './App.css';

// Network URLs
const NETWORKS = {
  devnet: 'https://fullnode.devnet.aptoslabs.com/v1',
  testnet: 'https://fullnode.testnet.aptoslabs.com/v1',
  mainnet: 'https://fullnode.mainnet.aptoslabs.com/v1'
};

// Replace with your contract address
const CONTRACT_ADDRESS = '0x3aaccb52cd4838365d52f2004bcdd8a3643e5cfcd6f7de310acd42cffa5be6b4';

// Initialize the Aptos client
const CLIENT = new AptosClient(NETWORKS.devnet);

function App() {
  const [network, setNetwork] = useState('devnet'); // Default to Devnet
  const [client, setClient] = useState(CLIENT);
  const [account, setAccount] = useState(null);
  const [payee, setPayee] = useState('');
  const [amount, setAmount] = useState('');
  const [balance, setBalance] = useState(0);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    // Update client when network changes
    setClient(new AptosClient(NETWORKS[network]));
  }, [network]);

  useEffect(() => {
    if (account) {
      fetchBalance(account.address);
      fetchPaymentHistory(account.address);
    }
  }, [account]);

  // Connect wallet using Petra Wallet
  const connectWallet = async () => {
    try {
      const petra = new PetraWallet();

      const { address } = await petra.connect();
      setAccount({ address });
      alert(`Connected to wallet: ${address}`);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      setError('Failed to connect wallet.');
    }
  };

  // Fetch account balance
  const fetchBalance = async (address) => {
    try {
      const resources = await client.getAccountResources(address);
      const coinStore = resources.find(
        (resource) => resource.type === '0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>'
      );
      setBalance(coinStore?.data?.coin?.value || 0);
    } catch (error) {
      console.error('Failed to fetch balance:', error);
      setError('Failed to fetch balance.');
    }
  };

  // Fetch payment history
  const fetchPaymentHistory = async (address) => {
    try {
      const response = await client.getAccountResource(
        address,
        `${CONTRACT_ADDRESS}::my_payment_system::PaymentHistory`
      );
      setPaymentHistory(response.data.payments || []);
    } catch (error) {
      console.error('Failed to fetch payment history:', error);
      setError('Failed to fetch payment history.');
    }
  };

  // Make a payment
  const makePayment = async () => {
    if (!payee || !amount) {
      alert('Payee address and amount are required.');
      return;
    }

    const amountToPay = parseInt(amount, 10);

    if (amountToPay > balance) {
      alert('Insufficient balance for this payment.');
      return;
    }

    try {
      const payload = {
        type: 'entry_function_payload',
        function: `${CONTRACT_ADDRESS}::my_payment_system::make_payment`,
        arguments: [payee, amountToPay],
        type_arguments: [],
      };

      const petra = new PetraWallet();
      const txnRequest = await petra.generateTransaction(account.address, payload);
      const signedTxn = await petra.signTransaction(txnRequest);
      const txnResponse = await petra.submitTransaction(signedTxn);
      await client.waitForTransaction(txnResponse.hash);

      alert('Payment Successful!');
      fetchBalance(account.address); // Refresh balance after payment
      fetchPaymentHistory(account.address); // Refresh payment history
    } catch (error) {
      console.error('Payment failed:', error);
      setError('Payment failed, please try again.');
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>My Payment System</h1>

        {/* Network Selection */}
        <div>
          <label>Select Network:</label>
          <select value={network} onChange={(e) => setNetwork(e.target.value)}>
            <option value="devnet">Devnet</option>
            <option value="testnet">Testnet</option>
            <option value="mainnet">Mainnet</option>
          </select>
        </div>

        {!account ? (
          <button onClick={connectWallet}>Connect Wallet</button>
        ) : (
          <div>
            <p>Connected Wallet: {account.address}</p>
            <p>Balance: {balance} AptosCoin</p>
          </div>
        )}

        <div>
          <h2>Make a Payment</h2>
          <input
            type="text"
            placeholder="Payee Address"
            value={payee}
            onChange={(e) => setPayee(e.target.value)}
          />
          <input
            type="number"
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <button onClick={makePayment}>Send Payment</button>

          <h2>Payment History</h2>
          <button onClick={() => fetchPaymentHistory(account.address)}>Refresh Payment History</button>
          <ul>
            {paymentHistory.map((payment, index) => (
              <li key={index}>
                {payment.payer} paid {payment.amount} AptosCoin to {payment.payee}
              </li>
            ))}
          </ul>
        </div>

        {error && <p style={{ color: 'red' }}>{error}</p>}
      </header>
    </div>
  );
}

export default App;

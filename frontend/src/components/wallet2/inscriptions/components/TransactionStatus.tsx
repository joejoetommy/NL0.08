import React from 'react';

interface TransactionStatusProps {
  status: { type: 'success' | 'error' | 'info' | null; message: string };
  lastTxid: string;
  network: 'mainnet' | 'testnet';
  lastTransactionTime: number;
}

export const TransactionStatus: React.FC<TransactionStatusProps> = ({
  status,
  lastTxid,
  network,
  lastTransactionTime
}) => {
  if (!status.type) return null;

  const getStatusStyles = () => {
    switch (status.type) {
      case 'error':
        return 'bg-red-900 bg-opacity-50 text-red-300 border-red-700';
      case 'success':
        return 'bg-green-900 bg-opacity-50 text-green-300 border-green-700';
      case 'info':
        return 'bg-blue-900 bg-opacity-50 text-blue-300 border-blue-700';
      default:
        return '';
    }
  };

  const getIcon = () => {
    switch (status.type) {
      case 'error':
        return '❌';
      case 'success':
        return '✅';
      case 'info':
        return 'ℹ️';
      default:
        return '';
    }
  };

  return (
    <div className={`mb-4 p-3 rounded-lg border ${getStatusStyles()}`}>
      <div className="flex items-start gap-2">
        <span className="text-lg">{getIcon()}</span>
        <div className="flex-1">
          <p className="whitespace-pre-wrap">{status.message}</p>
          
          {lastTxid && status.type === 'success' && (
            <div className="mt-2 space-y-1">
              <a 
                href={`https://${network === 'testnet' ? 'test.' : ''}whatsonchain.com/tx/${lastTxid}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 underline text-sm block"
              >
                View Transaction →
              </a>
              <a 
                href={`https://1satordinals.com/inscription/${lastTxid}_0`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-400 hover:text-purple-300 underline text-sm block"
              >
                View on 1SatOrdinals →
              </a>
            </div>
          )}
          
          {status.type === 'error' && status.message.includes('clipboard') && (
            <div className="mt-3 p-2 bg-gray-800 rounded">
              <p className="text-xs text-gray-300 mb-2">Broadcast manually:</p>
              <a 
                href={`https://${network === 'testnet' ? 'test.' : ''}whatsonchain.com/broadcast`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
              >
                Open WhatsOnChain Broadcast
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          )}
          
          {status.type === 'success' && Date.now() - lastTransactionTime < 30000 && (
            <p className="text-xs text-gray-300 mt-2">
              Transaction sent {Math.floor((Date.now() - lastTransactionTime) / 1000)} seconds ago
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
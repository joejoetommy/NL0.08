import React from 'react';

interface WalletInfoProps {
  keyData: {
    address?: string;
    privateKey?: string;
  };
  balance: {
    confirmed: number;
    unconfirmed: number;
  };
  blogKeyHistory: any;
}

export const WalletInfo: React.FC<WalletInfoProps> = ({
  keyData,
  balance,
  blogKeyHistory
}) => {
  const formatAddress = (address: string) => {
    if (!address) return 'Not connected';
    return `${address.substring(0, 12)}...${address.substring(address.length - 8)}`;
  };

  const formatBalance = (sats: number) => {
    if (sats >= 100000000) {
      return `${(sats / 100000000).toFixed(8)} BSV`;
    }
    return `${sats.toLocaleString()} sats`;
  };

  return (
    <div className="p-3 bg-gray-800 rounded-lg space-y-2">
      <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
        Wallet Information
      </h4>
      
      {/* Address */}
      <div className="flex justify-between items-center text-sm">
        <span className="text-gray-400">Address:</span>
        <span className="text-gray-300 font-mono text-xs">
          {formatAddress(keyData.address || '')}
        </span>
      </div>
      
      {/* Balance */}
      <div className="flex justify-between items-center text-sm">
        <span className="text-gray-400">Balance:</span>
        <div className="text-right">
          <span className="text-gray-300 font-medium">
            {formatBalance(balance.confirmed)}
          </span>
          {balance.unconfirmed > 0 && (
            <span className="text-xs text-yellow-400 block">
              +{formatBalance(balance.unconfirmed)} pending
            </span>
          )}
        </div>
      </div>
      
      {/* Blog Key Status */}
      {blogKeyHistory.current && (
        <div className="flex justify-between items-center text-sm pt-2 border-t border-gray-700">
          <span className="text-gray-400">Blog Key:</span>
          <div className="text-right">
            <span className="text-gray-300 text-xs">
              {blogKeyHistory.current.version}
            </span>
            <span className="text-gray-500 ml-1 text-xs">
              ({blogKeyHistory.current.fullKey.substring(0, 8)}...)
            </span>
          </div>
        </div>
      )}
      
      {/* Status Indicators */}
      <div className="flex gap-2 mt-3 pt-3 border-t border-gray-700">
        <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
          keyData.address ? 'bg-green-900 bg-opacity-50 text-green-300' : 'bg-gray-700 text-gray-400'
        }`}>
          <span>{keyData.address ? '🟢' : '⚫'}</span>
          <span>{keyData.address ? 'Connected' : 'Disconnected'}</span>
        </div>
        
        {blogKeyHistory.current && (
          <div className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-indigo-900 bg-opacity-50 text-indigo-300">
            <span>🔐</span>
            <span>Encryption Ready</span>
          </div>
        )}
      </div>
      
      {/* Low Balance Warning */}
      {balance.confirmed < 500 && balance.confirmed > 0 && (
        <div className="mt-2 p-2 bg-yellow-900 bg-opacity-50 rounded text-xs text-yellow-300">
          ⚠️ Low balance. You need at least 500 sats to create inscriptions.
        </div>
      )}
    </div>
  );
};
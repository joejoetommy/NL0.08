export interface TokenMail {
  id: string;
  name: string;
  xpub: string;
  txid: string;
  text: string; 
  date: string;
  read: boolean;
  replies?: TokenMail[];
}

export const cryptoChatData: TokenMail[] = [
  {
    id: "1",
    name: "QWxpY2UgQ2hlbg==",
    xpub: "xpub6CUGRUonZSQ4TWtTMmzXdrXDtypWKiKpXFkPNhG5hJwFzPwH8KqFtL6k6TnJ5Nzv8ZqDZLLBERK7vXzT5MqFGqAR8DKppifCwvpPnJPjKEm",
    txid: "3b7d4f8a9c2e1b6f5d3a8e7c4b9f2d6a1e8c5b3f7d2a9e6c4b1f8d5a3e7c2b9f",
    text: "SGV5ISBEaWQgeW91IGdldCB0aGUgcGF5bWVudCBJIHNlbnQgeWVzdGVyZGF5PyBDaGVjayB5b3VyIHdhbGxldC4=",
    date: "2024-06-25T10:30:00",
    read: false,
    replies: [
      {
        id: "1-1",
        name: "You",
        xpub: "xpub6BfKNVXpDKyWRxMpzvhbJd6WwQqBNMPNHvq8p4HxJqnubEY8jFzL7Uru8wtqJZjvtmqFb8hPjr3FqXFDYQvpNjKKDXjLYCWPcUvhmuK5hMx",
        txid: "8e4a7b3f2d1c9e6b5a4f8d3c7e2b9a6f1d5c4e3b8a7f2d6c9e1b4a5f3d8c7e2",
        text: "WWVzLCByZWNlaXZlZCBpdCEgVGhhbmtzIGZvciB0aGUgcXVpY2sgdHJhbnNmZXIu",
        date: "2024-06-25T11:15:00",
        read: true,
      },
      {
        id: "1-2", 
        name: "QWxpY2UgQ2hlbg==",
        xpub: "xpub6CUGRUonZSQ4TWtTMmzXdrXDtypWKiKpXFkPNhG5hJwFzPwH8KqFtL6k6TnJ5Nzv8ZqDZLLBERK7vXzT5MqFGqAR8DKppifCwvpPnJPjKEm",
        txid: "7c3b5a9f1e8d4c2b6f9a3e7d5b8c1f4a6e2d9b7c3f5a8e1d4c6b9f2a3e7d5b8",
        text: "R3JlYXQhIExldCdzIGRpc2N1c3MgdGhlIG5leHQgdHJhbnNhY3Rpb24gdG9tb3Jyb3cu",
        date: "2024-06-25T11:45:00",
        read: false,
      }
    ]
  },
  {
    id: "2",
    name: "Qm9iIE1hcnRpbmV6",
    xpub: "xpub6DJr8JkZPtBCp3mSPnj7M3sSFY3DGqBJkZpPSSb4wBJz1mCKcCgKUthYvqVRVZBZqYbjPQ9YfKKKjPqkkqJq9CcatHVZRAXDcQJeKKPXtZy",
    txid: "9f2e8b7c4a3d1f6e5b8a9c2d7f4e3b8a1c6d5f9e2b7a4c3d8f1e6b5a9c2d7f4",
    text: "Q2FuIHlvdSBzZW5kIG1lIHRoZSB3YWxsZXQgYWRkcmVzcyBmb3Igb3VyIHByb2plY3Q/",
    date: "2024-06-24T14:20:00",
    read: true,
    replies: [
      {
        id: "2-1",
        name: "You",
        xpub: "xpub6BfKNVXpDKyWRxMpzvhbJd6WwQqBNMPNHvq8p4HxJqnubEY8jFzL7Uru8wtqJZjvtmqFb8hPjr3FqXFDYQvpNjKKDXjLYCWPcUvhmuK5hMx",
        txid: "5d8c3a9b7e2f1d4c6b8a5f9e3d7c2b4a8f1e6d5c9b3a7e2f4d8c1b6a5f9e3d7",
        text: "U3VyZSwgaGVyZSdzIHRoZSBhZGRyZXNzOiBiYzFxeHl6MjNnOWFkZHJlc3NleGFtcGxl",
        date: "2024-06-24T15:00:00",
        read: true,
      }
    ]
  },
  {
    id: "3",
    name: "Q2Fyb2wgV2lsbGlhbXM=",
    xpub: "xpub6E5ZvDXfuULqSqBvNnj5LcxAThxGb6kBeqbfM3tTxFjx4WKuUEXH9wYqPaZGvzJqGqvDfEqQBpdYpKDKJZjvRKphKpheSJ8tBVVL4mS7RQu",
    txid: "2a7f8d3b9c1e6f4a5d8b2e7c9f3a6d1b4e8c5f2a7d9b3e6c1f4a8d5b2e7c9f3",
    text: "SSBzYXcgdGhlIHRyYW5zYWN0aW9uIG9uIHRoZSBibG9ja2NoYWluLiBOaWNlIGdhcyBmZWUgb3B0aW1pemF0aW9uIQ==",
    date: "2024-06-23T09:15:00",
    read: true,
    replies: [
      {
        id: "3-1",
        name: "You",
        xpub: "xpub6BfKNVXpDKyWRxMpzvhbJd6WwQqBNMPNHvq8p4HxJqnubEY8jFzL7Uru8wtqJZjvtmqFb8hPjr3FqXFDYQvpNjKKDXjLYCWPcUvhmuK5hMx",
        txid: "8b4f7c2a9d3e1f6b5a8d4c7e2f9b3a6d1e5c8b4f7a2d9e6c3b1f8a5d4e7c2f9",
        text: "VGhhbmtzISBJIHVzZWQgYSBuZXcgYmF0Y2hpbmcgdGVjaG5pcXVlLg==",
        date: "2024-06-23T10:30:00",
        read: true,
      }
    ]
  },
  {
    id: "4",
    name: "RGF2aWQgS2lt",
    xpub: "xpub6FKyBQ5BbtA6h9GnZTLzXEpAVkiMt2QZLxvpKQL5BcGvjYaFWRXvGxrBPfKHKZjnJfQZJB2KsfNjTJ3DCYvbBmsZBTCjx5u6MJivgRVzVKy",
    txid: "6e9a4c7b3f2d8e1a5b9f6d3c8e7a2b4f1d5c9e6b3a8f7d2c4e9b1a6f5d3c8e7",
    text: "TmVlZCB5b3VyIGhlbHAgd2l0aCBtdWx0aXNpZyBzZXR1cC4gQXJlIHlvdSBmcmVlPw==",
    date: "2024-06-22T16:45:00",
    read: false,
    replies: [
      {
        id: "4-1",
        name: "You",
        xpub: "xpub6BfKNVXpDKyWRxMpzvhbJd6WwQqBNMPNHvq8p4HxJqnubEY8jFzL7Uru8wtqJZjvtmqFb8hPjr3FqXFDYQvpNjKKDXjLYCWPcUvhmuK5hMx",
        txid: "3c8f5b2a7d4e9c1f6b3a8d5e7c2f9b4a6d1e8c3f5b7a2d9e4c6f1b8a3d5e7c9",
        text: "WWVzLCBJIGNhbiBoZWxwIHRvbW9ycm93IGF0IDJQTS4=",
        date: "2024-06-22T17:30:00",
        read: true,
      },
      {
        id: "4-2",
        name: "RGF2aWQgS2lt",
        xpub: "xpub6FKyBQ5BbtA6h9GnZTLzXEpAVkiMt2QZLxvpKQL5BcGvjYaFWRXvGxrBPfKHKZjnJfQZJB2KsfNjTJ3DCYvbBmsZBTCjx5u6MJivgRVzVKy",
        txid: "9a3d7e5b8c2f4a6d1e9b7c3f5a8d2e4b6c1f9a3d7e5b8c2f4a6d1e9b7c3f5a8",
        text: "UGVyZmVjdCEgSSdsbCBzZW5kIHRoZSBkZXRhaWxzLg==",
        date: "2024-06-22T18:00:00",
        read: false,
      }
    ]
  },
  {
    id: "5",
    name: "RXZlIFRob21wc29u",
    xpub: "xpub6GQdNV5x7tLqJG8tZJnBLJxPUhXJn8KvMYqN9GGwfJQrBJNqUkXptRBovKEKPzJqHvzJdD3f6uBG4FnMAVpTVRxmgKaSrDCpQ5m2JKNqwAH",
    txid: "4b8d2f7c9a3e6b1d5f8a4c9e7b2d3f6a8e1c5b9d7f3a2e6c4b8f1d5a9e3c7b2",
    text: "Q2hlY2sgb3V0IHRoZSBuZXcgTGlnaHRuaW5nIE5ldHdvcmsgdXBkYXRlISBBbWF6aW5nIHNwZWVkcy4=",
    date: "2024-06-21T11:00:00",
    read: true,
    replies: [
      {
        id: "5-1",
        name: "You",
        xpub: "xpub6BfKNVXpDKyWRxMpzvhbJd6WwQqBNMPNHvq8p4HxJqnubEY8jFzL7Uru8wtqJZjvtmqFb8hPjr3FqXFDYQvpNjKKDXjLYCWPcUvhmuK5hMx",
        txid: "7e5c8b3a9f2d4e6c1b7a5f8d3c9e2b4a6f1d8c5e3b9a7f2d6c4e1b8a5f3d9c7",
        text: "V293LCB0aG9zZSBudW1iZXJzIGFyZSBpbXByZXNzaXZlIQ==",
        date: "2024-06-21T13:45:00",
        read: true,
      }
    ]
  }
];

// Additional standalone messages for each contact

export const additionalMessages: TokenMail[] = [

  {
    id: "6",
    name: "QWxpY2UgQ2hlbg==",
    xpub: "xpub6CUGRUonZSQ4TWtTMmzXdrXDtypWKiKpXFkPNhG5hJwFzPwH8KqFtL6k6TnJ5Nzv8ZqDZLLBERK7vXzT5MqFGqAR8DKppifCwvpPnJPjKEm",
    txid: "1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2",
    text: "UmVtZW1iZXIgdG8gYmFja3VwIHlvdXIgc2VlZCBwaHJhc2Uh",
    date: "2024-06-20T08:30:00",
    read: true,
  },
  {
    id: "7",
    name: "QWxpY2UgQ2hlbg==",
    xpub: "xpub6CUGRUonZSQ4TWtTMmzXdrXDtypWKiKpXFkPNhG5hJwFzPwH8KqFtL6k6TnJ5Nzv8ZqDZLLBERK7vXzT5MqFGqAR8DKppifCwvpPnJPjKEm",
    txid: "2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3",
    text: "Rm91bmQgYSBnb29kIGRlY2VudHJhbGl6ZWQgZXhjaGFuZ2Uh",
    date: "2024-06-19T15:20:00",
    read: false,
  },
  {
    id: "8",
    name: "QWxpY2UgQ2hlbg==",
    xpub: "xpub6CUGRUonZSQ4TWtTMmzXdrXDtypWKiKpXFkPNhG5hJwFzPwH8KqFtL6k6TnJ5Nzv8ZqDZLLBERK7vXzT5MqFGqAR8DKppifCwvpPnJPjKEm",
    txid: "3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4",
    text: "TmV3IHdhbGxldCB1cGRhdGUgYXZhaWxhYmxlLg==",
    date: "2024-06-18T12:00:00",
    read: true,
  },
  // Bob's additional messages
  {
    id: "9",
    name: "Qm9iIE1hcnRpbmV6",
    xpub: "xpub6DJr8JkZPtBCp3mSPnj7M3sSFY3DGqBJkZpPSSb4wBJz1mCKcCgKUthYvqVRVZBZqYbjPQ9YfKKKjPqkkqJq9CcatHVZRAXDcQJeKKPXtZy",
    txid: "4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5",
    text: "TWluaW5nIHJld2FyZHMganVzdCBhcnJpdmVkIQ==",
    date: "2024-06-17T18:45:00",
    read: false,
  },
  {
    id: "10",
    name: "Qm9iIE1hcnRpbmV6",
    xpub: "xpub6DJr8JkZPtBCp3mSPnj7M3sSFY3DGqBJkZpPSSb4wBJz1mCKcCgKUthYvqVRVZBZqYbjPQ9YfKKKjPqkkqJq9CcatHVZRAXDcQJeKKPXtZy",
    txid: "5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6",
    text: "UHJvamVjdCBmdW5kaW5nIGNvbmZpcm1lZC4=",
    date: "2024-06-16T10:30:00",
    read: true,
  },
  {
    id: "11",
    name: "Qm9iIE1hcnRpbmV6",
    xpub: "xpub6DJr8JkZPtBCp3mSPnj7M3sSFY3DGqBJkZpPSSb4wBJz1mCKcCgKUthYvqVRVZBZqYbjPQ9YfKKKjPqkkqJq9CcatHVZRAXDcQJeKKPXtZy",
    txid: "6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7",
    text: "U21hcnQgY29udHJhY3QgYXVkaXQgcmVwb3J0Lg==",
    date: "2024-06-15T14:15:00",
    read: true,
  },
  {
    id: "12",
    name: "Q2Fyb2wgV2lsbGlhbXM=",
    xpub: "xpub6E5ZvDXfuULqSqBvNnj5LcxAThxGb6kBeqbfM3tTxFjx4WKuUEXH9wYqPaZGvzJqGqvDfEqQBpdYpKDKJZjvRKphKpheSJ8tBVVL4mS7RQu",
    txid: "7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8",
    text: "TmV3IEROUyByZWNvcmQgZm9yIEVOUyBkb21haW4u",
    date: "2024-06-14T09:00:00",
    read: false,
  },
  {
    id: "13",
    name: "Q2Fyb2wgV2lsbGlhbXM=",
    xpub: "xpub6E5ZvDXfuULqSqBvNnj5LcxAThxGb6kBeqbfM3tTxFjx4WKuUEXH9wYqPaZGvzJqGqvDfEqQBpdYpKDKJZjvRKphKpheSJ8tBVVL4mS7RQu",
    txid: "8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9",
    text: "TkZUIGNvbGxlY3Rpb24gbGF1bmNoIHRvbW9ycm93IQ==",
    date: "2024-06-13T16:30:00",
    read: true,
  },
  {
    id: "14",
    name: "RGF2aWQgS2lt",
    xpub: "xpub6FKyBQ5BbtA6h9GnZTLzXEpAVkiMt2QZLxvpKQL5BcGvjYaFWRXvGxrBPfKHKZjnJfQZJB2KsfNjTJ3DCYvbBmsZBTCjx5u6MJivgRVzVKy",
    txid: "9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0",
    text: "SGFyZHdhcmUgd2FsbGV0IGRpc2NvdW50IGNvZGUu",
    date: "2024-06-12T13:45:00",
    read: true,
  },
  {
    id: "15",
    name: "RGF2aWQgS2lt",
    xpub: "xpub6FKyBQ5BbtA6h9GnZTLzXEpAVkiMt2QZLxvpKQL5BcGvjYaFWRXvGxrBPfKHKZjnJfQZJB2KsfNjTJ3DCYvbBmsZBTCjx5u6MJivgRVzVKy",
    txid: "0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1",
    text: "VGVzdG5ldCBmYXVjZXQgaXMgd29ya2luZyBhZ2Fpbi4=",
    date: "2024-06-11T11:20:00",
    read: false,
  },
  {
    id: "16",
    name: "RXZlIFRob21wc29u",
    xpub: "xpub6GQdNV5x7tLqJG8tZJnBLJxPUhXJn8KvMYqN9GGwfJQrBJNqUkXptRBovKEKPzJqHvzJdD3f6uBG4FnMAVpTVRxmgKaSrDCpQ5m2JKNqwAH",
    txid: "1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2",
    text: "QmxvY2tjaGFpbiBjb25mZXJlbmNlIG5leHQgd2Vlay4=",
    date: "2024-06-10T17:00:00",
    read: true,
  },
  {
    id: "17",
    name: "RXZlIFRob21wc29u",
    xpub: "xpub6GQdNV5x7tLqJG8tZJnBLJxPUhXJn8KvMYqN9GGwfJQrBJNqUkXptRBovKEKPzJqHvzJdD3f6uBG4FnMAVpTVRxmgKaSrDCpQ5m2JKNqwAH",
    txid: "2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3",
    text: "TmV3IHN0YWtpbmcgcmV3YXJkcyBwcm9ncmFtLg==",
    date: "2024-06-09T19:30:00",
    read: false,
  }
];

// Helper function to combine and sort all messages
export function getAllCryptoMessages(): TokenMail[] {
  return [...cryptoChatData, ...additionalMessages].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}
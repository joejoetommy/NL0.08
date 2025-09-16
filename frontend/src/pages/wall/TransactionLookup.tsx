import React, { useState } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../components/ui/dialog';
import { toast } from '../../components/ui/use-toast';
import { Search, Loader2 } from 'lucide-react';

interface TransactionLookupProps {
  network: 'mainnet' | 'testnet';
  onTransactionFound: (post: any) => void;
}

/* ============================== Helpers ============================== */

/** Hex -> bytes (browser-safe, no Buffer) */
const hexToBytes = (hex: string): Uint8Array => {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (clean.length % 2 !== 0) throw new Error('Invalid hex length');
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    out[i / 2] = parseInt(clean.slice(i, i + 2), 16);
  }
  return out;
};

/** Bytes -> UTF-8 string; be lenient for invalid sequences */
const bytesToUtf8 = (bytes: Uint8Array): string => {
  try {
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  } catch {
    // Defensive fallback
    let s = '';
    for (let i = 0; i < bytes.length; i++) {
      const b = bytes[i];
      if (b >= 32 && b <= 126) s += String.fromCharCode(b);
    }
    return s;
  }
};

/** Parse Bitcoin Script and concatenate only pushdata payloads.
 *  Supports: <OP_N (1..75)>, OP_PUSHDATA1 (0x4c), OP_PUSHDATA2 (0x4d), OP_PUSHDATA4 (0x4e), OP_0 (empty).
 */
const collectPushData = (scriptHex: string): Uint8Array => {
  const b = hexToBytes(scriptHex);
  let i = 0;
  const chunks: Uint8Array[] = [];

  while (i < b.length) {
    const op = b[i++];
    if (op === 0x00) {
      // OP_0 -> empty push (ignore or include as empty)
      continue;
    }
    if (op >= 0x01 && op <= 0x4b) {
      // direct push N bytes
      const len = op;
      if (i + len > b.length) break;
      chunks.push(b.slice(i, i + len));
      i += len;
      continue;
    }
    if (op === 0x4c) {
      // OP_PUSHDATA1
      if (i + 1 > b.length) break;
      const len = b[i++];
      if (i + len > b.length) break;
      chunks.push(b.slice(i, i + len));
      i += len;
      continue;
    }
    if (op === 0x4d) {
      // OP_PUSHDATA2 (LE)
      if (i + 2 > b.length) break;
      const len = b[i] | (b[i + 1] << 8);
      i += 2;
      if (i + len > b.length) break;
      chunks.push(b.slice(i, i + len));
      i += len;
      continue;
    }
    if (op === 0x4e) {
      // OP_PUSHDATA4 (LE)
      if (i + 4 > b.length) break;
      const len =
        (b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24)) >>> 0;
      i += 4;
      if (i + len > b.length) break;
      chunks.push(b.slice(i, i + len));
      i += len;
      continue;
    }
    // Other opcodes: skip (do not treat as data)
  }

  // concat
  const total = chunks.reduce((acc, c) => acc + c.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.length;
  }
  return out;
};

/** Extract first balanced JSON object {...} from a string (aware of strings/escapes). */
const extractBalancedJson = (text: string): string | null => {
  const start = text.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
};

const safeParseJSON = (s: string | null): any | null => {
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch {
    const idx = s.indexOf('{');
    if (idx > 0) {
      try {
        return JSON.parse(s.slice(idx));
      } catch {
        return null;
      }
    }
    return null;
  }
};

const isWallt4 = (obj: any): boolean =>
  !!obj && (obj.protocol === 'wallt4' || obj.app === 'wallt4');

/** Normalize epoch timestamps that might be in s/ms/µs/ns. Returns ms. */
const normalizeTimestampMs = (x?: number): number | undefined => {
  if (typeof x !== 'number' || !Number.isFinite(x)) return undefined;
  if (x >= 1e17) return Math.floor(x / 1e6); // ns -> ms
  if (x >= 1e14) return Math.floor(x / 1e3); // µs -> ms
  if (x >= 1e12) return Math.floor(x);       // ms
  return Math.floor(x * 1000);               // s -> ms
};

const toHumanDate = (ms?: number): string => {
  if (!ms || Number.isNaN(ms)) return new Date().toLocaleString();
  return new Date(ms).toLocaleString();
};

/** Build a safe image URL from various formats. */
const normalizeImageUrl = (img: unknown): string | undefined => {
  if (!img || typeof img !== 'string') return undefined;
  if (img.startsWith('data:image/')) return img;
  if (/^https?:\/\//i.test(img)) return img;
  // If it looks like base64, wrap it
  if (/^[A-Za-z0-9+/=\s]+$/.test(img) && img.length > 128) {
    return `data:image/png;base64,${img.replace(/\s+/g, '')}`;
  }
  return undefined;
};

/** Redact very large fields for preview (esp. base64 image) to avoid layout break */
const redactForPreview = (value: any): any => {
  const MAX_STRING_PREVIEW = 600;

  const redactString = (s: string) => {
    if (s.startsWith('data:image/')) {
      return `[image data-url omitted, length ${s.length}]`;
    }
    if (/^[A-Za-z0-9+/=\s]+$/.test(s) && s.length > 256) {
      return `[base64 omitted, length ${s.length}]`;
    }
    if (s.length > MAX_STRING_PREVIEW) {
      const head = s.slice(0, 300);
      const tail = s.slice(-200);
      return `${head}…[${s.length - 500} bytes omitted]…${tail}`;
    }
    return s;
  };

  const recur = (v: any): any => {
    if (v == null) return v;
    if (typeof v === 'string') return redactString(v);
    if (Array.isArray(v)) return v.map(recur);
    if (typeof v === 'object') {
      const out: Record<string, any> = {};
      for (const k of Object.keys(v)) {
        if (k.toLowerCase() === 'image' && typeof v[k] === 'string') {
          out[k] = redactString(v[k]);
        } else {
          out[k] = recur(v[k]);
        }
      }
      return out;
    }
    return v;
  };

  return recur(value);
};

/* ============================== Component ============================== */

export const TransactionLookup: React.FC<TransactionLookupProps> = ({ network, onTransactionFound }) => {
  const [txid, setTxid] = useState('');
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [foundPost, setFoundPost] = useState<any>(null);

  /** Parse inscription content from vout[0].scriptPubKey.hex using real script parsing. */
  const parseInscriptionFromTx = (tx: any): any | null => {
    try {
      const scriptHex: string | undefined = tx?.vout?.[0]?.scriptPubKey?.hex;
      if (!scriptHex) return null;

      // 1) Collect only pushdata bytes
      const pushed = collectPushData(scriptHex);

      // 2) Decode to utf8 and extract balanced JSON
      const pushedText = bytesToUtf8(pushed);
      const jsonStr = extractBalancedJson(pushedText);
      const jsonObj = safeParseJSON(jsonStr);

      let content: any;
      let inscriptionType: 'wallt4' | 'json' | 'text' | 'unknown' = 'unknown';

      if (jsonObj) {
        content = jsonObj;
        inscriptionType = isWallt4(jsonObj) ? 'wallt4' : 'json';
      } else {
        // Fallback: try reading as loose text (rarely needed for wallt4)
        content = pushedText.trim() || scriptHex;
        inscriptionType = 'text';
      }

      // 3) Origin (likely the change vout[1] P2PKH address)
      const origin =
        tx.vout?.[1]?.scriptPubKey?.addresses?.[0] ||
        tx.vout?.[1]?.scriptPubKey?.address ||
        'unknown';

      // 4) Timestamp preference: embedded > tx.time
      const embeddedTsRaw =
        (content?.data?.timestamp ??
          content?.timestamp ??
          (typeof content?.date === 'number' ? content?.date : undefined)) as
          | number
          | undefined;

      const tsMs =
        normalizeTimestampMs(embeddedTsRaw) ??
        (typeof tx.time === 'number' ? tx.time * 1000 : Date.now());

      return {
        txid: tx.txid,
        vout: 0,
        timestamp: tsMs,
        origin,
        inscriptionType,
        content,      // full object/string
        contentRaw: jsonStr ?? pushedText, // useful for debugging
        size: tx.size,
        scriptHex,
        isWallt4: isWallt4(content),
      };
    } catch (e) {
      console.error('Error parsing transaction:', e);
      return null;
    }
  };

  /** Transform to your app's Post shape */
  const transformToPost = (inscription: any): any => {
    const c = inscription.content;

    if (inscription.inscriptionType === 'wallt4' || isWallt4(c)) {
      // Support both envelopes:
      // A) { protocol:'wallt4', version, data:{...} }
      // B) { app:'wallt4', title, content, image, ... }
      const data = c.data ?? c;

      const ts = normalizeTimestampMs(data.timestamp) ?? inscription.timestamp;

      return {
        id: inscription.txid,
        title: data.title ?? 'Untitled',
        user: inscription.origin ?? 'Unknown',
        content: data.content ?? 'No content',
        imageUrl: normalizeImageUrl(data.image) ?? '/api/placeholder/200/200',
        type: data.type ?? 'Article',
        date: ts ?? Date.now(),
        createdAt: toHumanDate(ts),
        encrypted: inscription.encrypted ?? data.encrypted ?? false,
        encryptionLevel:
          inscription.encryptionLevel ?? data.encryptionLevel ?? 0,
        txid: inscription.txid,
        vout: inscription.vout ?? 0,
        size: inscription.size,
        rawTransaction: inscription,
        isWallt4: true,
        inscriptionType: 'wallt4',
        Interact: { Likes: [], Dislikes: [], Tip: [], Comment: [] },
        commentList: [],
      };
    }

    // Generic JSON / text
    const title =
      (typeof c === 'object' && c?.title) || 'Unknown Inscription';
    const body =
      (typeof c === 'object' && (c.content || c.text || JSON.stringify(c))) ||
      (typeof c === 'string' ? c : 'No content');

    const imgUrl =
      (typeof c === 'object' && normalizeImageUrl((c as any)?.image)) ||
      '/api/placeholder/200/200';

    const ts = inscription.timestamp;

    return {
      id: inscription.txid,
      title,
      user: inscription.origin ?? 'Unknown',
      content: body,
      imageUrl: imgUrl,
      type: (typeof c === 'object' && (c as any).type) || 'Unknown',
      date: ts ?? Date.now(),
      createdAt: toHumanDate(ts),
      encrypted: false,
      encryptionLevel: 0,
      txid: inscription.txid,
      vout: inscription.vout ?? 0,
      size: inscription.size,
      rawTransaction: inscription,
      isWallt4: false,
      inscriptionType: inscription.inscriptionType ?? 'unknown',
      Interact: { Likes: [], Dislikes: [], Tip: [], Comment: [] },
      commentList: [],
    };
  };

  const fetchTransaction = async () => {
    if (!txid || txid.trim().length === 0) {
      toast({
        title: 'Invalid Input',
        description: 'Please enter a transaction ID',
        variant: 'destructive',
      });
      return;
    }

    if (!/^[a-fA-F0-9]{64}$/.test(txid.trim())) {
      toast({
        title: 'Invalid Format',
        description: 'Transaction ID must be 64 hexadecimal characters',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const apiUrl =
        network === 'testnet'
          ? `https://api.whatsonchain.com/v1/bsv/test/tx/${txid.trim()}`
          : `https://api.whatsonchain.com/v1/bsv/main/tx/${txid.trim()}`;

      const res = await fetch(apiUrl);
      if (!res.ok) {
        if (res.status === 404) throw new Error('Transaction not found');
        throw new Error('Failed to fetch transaction');
      }
      const txData = await res.json();

      const inscription = parseInscriptionFromTx(txData);
      if (!inscription) {
        toast({
          title: 'Not an Inscription',
          description: 'This transaction does not appear to be an inscription',
          variant: 'destructive',
        });
        return;
      }

      const post = transformToPost(inscription);
      setFoundPost(post);

      toast({
        title: 'Transaction Found',
        description: post.isWallt4
          ? 'Wallt4 post loaded successfully'
          : 'Inscription loaded successfully',
      });

      onTransactionFound(post);
    } catch (e: any) {
      console.error('Error fetching transaction:', e);
      toast({
        title: 'Error',
        description: e?.message ?? 'Failed to fetch transaction',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setTxid('');
    setFoundPost(null);
  };

  const renderContentPreview = (content: any) => {
    const preview = redactForPreview(content);
    if (typeof preview === 'string') return preview;
    try {
      return JSON.stringify(preview, null, 2);
    } catch {
      return String(preview);
    }
  };

  const renderImage = (url?: string) => {
    if (!url) return null;
    return (
      <img
        src={url}
        alt="inscription"
        className="mt-2 rounded border max-h-48 object-contain w-full"
        loading="lazy"
      />
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Search className="h-4 w-4" />
          Lookup TX
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Transaction Lookup</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="txid">Transaction ID</Label>
            <Input
              id="txid"
              placeholder="Enter transaction ID (64 hex characters)"
              value={txid}
              onChange={(e) => setTxid(e.target.value)}
              className="font-mono text-xs"
            />
            <p className="text-xs text-gray-500">
              Network: {network === 'testnet' ? 'Testnet' : 'Mainnet'}
            </p>
          </div>

          <Button onClick={fetchTransaction} disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Fetching...
              </>
            ) : (
              'Fetch Transaction'
            )}
          </Button>

          {foundPost && (
            <div className="border rounded-lg p-4 space-y-2 bg-gray-50">
              <h3 className="font-semibold text-sm">Found Inscription:</h3>
              <div className="space-y-1 text-xs">
                <p><strong>Title:</strong> {foundPost.title}</p>
                <p><strong>Type:</strong> {foundPost.type}</p>
                <p><strong>Wallt4:</strong> {foundPost.isWallt4 ? 'Yes' : 'No'}</p>
                <p><strong>Date:</strong> {foundPost.createdAt}</p>
                <p className="text-[11px] leading-snug whitespace-pre-wrap break-words">
                  <strong>Content:</strong>{' '}
                  {renderContentPreview(foundPost.content)}
                </p>
              </div>
              {renderImage(foundPost.imageUrl)}
              <div className="pt-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleClose}
                  className="w-full"
                >
                  Close & View in List
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

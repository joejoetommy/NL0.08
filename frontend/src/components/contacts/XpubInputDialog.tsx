// Add Network Connection
import { useState, useRef, useEffect } from 'react';
import { Button } from "../ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "../ui/alert-dialog";
import { QRCodeSVG } from 'qrcode.react';
import QrScanner from 'qr-scanner'; // npm install qr-scanner

interface XpubInputDialogProps {
  isOpen: boolean;
  onClose: (open: boolean) => void;
  onXpubSubmit?: (xpub: string) => void;
}

export function XpubInputDialog({ isOpen, onClose, onXpubSubmit }: XpubInputDialogProps) {
  const [xpubInput, setXpubInput] = useState<string>("");
  const [showScanner, setShowScanner] = useState(false);
  const [scanError, setScanError] = useState<string>('');
  const [displayQR, setDisplayQR] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scannerRef = useRef<QrScanner | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setXpubInput(value);
    // Show QR if valid xpub is entered (basic validation)
    setDisplayQR(value.length > 50);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setXpubInput(text);
      setDisplayQR(text.length > 50);
    } catch (err) {
      console.error('Failed to read clipboard:', err);
    }
  };

  const startCamera = async () => {
    try {
      setScanError('');
      setShowScanner(true);
      
      // Wait for the video element to be available
      setTimeout(() => {
        if (videoRef.current) {
          // Initialize QR Scanner
          const qrScanner = new QrScanner(
            videoRef.current,
            (result) => {
              // Successfully scanned QR code
              console.log('Scanned:', result.data);
              setXpubInput(result.data);
              setDisplayQR(true);
              stopCamera();
            },
            {
              returnDetailedScanResult: true,
              highlightScanRegion: true,
              highlightCodeOutline: true,
            }
          );
          
          scannerRef.current = qrScanner;
          qrScanner.start().catch(err => {
            console.error('Error starting scanner:', err);
            setScanError('Unable to access camera. Please check permissions.');
          });
        }
      }, 100);
    } catch (err) {
      console.error('Error accessing camera:', err);
      setScanError('Unable to access camera. Please check permissions.');
    }
  };

  const stopCamera = () => {
    if (scannerRef.current) {
      scannerRef.current.stop();
      scannerRef.current.destroy();
      scannerRef.current = null;
    }
    setShowScanner(false);
    setScanError('');
  };

  // Cleanup camera on unmount or dialog close
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
    }
    
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop();
        scannerRef.current.destroy();
      }
    };
  }, [isOpen]);

  const handleScan = () => {
    // This is where you would integrate QR scanning
    // For demo purposes, we'll simulate a successful scan
    console.log('Scanning for QR code...');
    // You would integrate qr-scanner or jsQR here
    // Example of simulated scan result:
    // setTimeout(() => {
    //   const scannedXpub = "xpub123..."; // Result from QR scan
    //   setXpubInput(scannedXpub);
    //   setDisplayQR(true);
    //   stopCamera();
    // }, 2000);
  };

  const handleSubmit = () => {
    if (xpubInput && onXpubSubmit) {
      onXpubSubmit(xpubInput);
    }
    onClose(false);
    // Reset state
    setXpubInput('');
    setDisplayQR(false);
  };

  const handleClose = () => {
    stopCamera();
    onClose(false);
    // Reset state
    setXpubInput('');
    setDisplayQR(false);
    setScanError('');
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={handleClose}>
      <AlertDialogContent className="sm:max-w-[500px] bg-white dark:bg-gray-900 text-black dark:text-white">
        <AlertDialogHeader>
          <AlertDialogTitle>Add Network Connection</AlertDialogTitle>
          <AlertDialogDescription>
            Paste an xpub key or scan a QR code to add a new connection
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-4 py-4">
          {!showScanner ? (
            <>
              {/* Input area */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Extended Public Key (xpub)</label>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={handlePaste}
                    className="ml-auto"
                  >
                    Paste
                  </Button>
                </div>
                
                <textarea
                  value={xpubInput}
                  onChange={handleInputChange}
                  placeholder="Enter or paste xpub key..."
                  className="w-full min-h-[100px] p-3 text-sm font-mono bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* QR Code Scanner Button */}
              <div className="flex justify-center">
                <button
                  onClick={startCamera}
                  className="flex flex-col items-center gap-2 p-6 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors group"
                >
                  <div className="p-4 bg-white dark:bg-gray-900 rounded-lg group-hover:scale-110 transition-transform">
                    <svg 
                      className="w-12 h-12 text-gray-600 dark:text-gray-400" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium">Scan QR Code</span>
                </button>
              </div>

                        <div className="grid gap-4 py-1">
                          <div className="grid grid-cols-4 items-center gap-4">
                            <textarea
                              id="username"
                              placeholder="Add message to this transaction... "
                              rows={2}
                              className="col-span-4 resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                           />
                          </div>
                        </div>


              {displayQR && xpubInput && (
                <div className="flex flex-col items-center gap-2 mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">QR Code Preview:</p>
                  <div className="bg-white p-4 rounded-md">
                    <QRCodeSVG value={xpubInput} size={180} includeMargin={true} />
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Camera Scanner View */
            <div className="space-y-3">
              {scanError ? (
                <div className="bg-red-100 dark:bg-red-900/20 border border-red-500 rounded-lg p-4 text-red-600 dark:text-red-400">
                  {scanError}
                </div>
              ) : (
                <div className="relative">
                  <video
                    ref={videoRef}
                    className="w-full rounded-lg"
                  />
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute inset-4 border-2 border-blue-500 rounded-lg">
                      <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-lg"></div>
                      <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-lg"></div>
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-lg"></div>
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-lg"></div>
                    </div>
                  </div>
                </div>
              )}
              
              <p className="text-sm text-gray-500 text-center">
                Position the QR code within the frame to scan
              </p>
              
              <Button 
                variant="outline" 
                onClick={stopCamera}
                className="w-full"
              >
                Cancel Scan
              </Button>
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <Button 
            variant="outline"
            onClick={handleClose}
          >
            Cancel
          </Button>
          <Button 
            className="bg-blue-500 hover:bg-blue-600"
            onClick={handleSubmit}
            disabled={!xpubInput}
          >
           Create transaction
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
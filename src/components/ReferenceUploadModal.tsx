import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, CheckCircle2, ImagePlus, X, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { uploadReference } from "@/lib/api";

interface ReferenceUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  studentName: string;
}

const ReferenceUploadModal = ({
  isOpen,
  onClose,
  onComplete,
  studentName,
}: ReferenceUploadModalProps) => {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (selected: FileList | null) => {
    if (!selected) return;
    const newFiles: File[] = [];
    const newPreviews: string[] = [];
    Array.from(selected).forEach((file) => {
      if (file.type.startsWith("image/")) {
        newFiles.push(file);
        newPreviews.push(URL.createObjectURL(file));
      }
    });
    setFiles((prev) => [...prev, ...newFiles]);
    setPreviews((prev) => [...prev, ...newPreviews]);
  };

  const removeFile = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    try {
      await uploadReference(files);
      setUploaded(true);
      toast.success("Reference handwriting saved!");
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleFinish = () => {
    onComplete();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !uploading && onClose()}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Welcome, {studentName}!</DialogTitle>
          <DialogDescription>
            Please upload some samples of your handwriting. This will be used as a reference to verify your future assignments.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          <AnimatePresence mode="wait">
            {uploaded ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-4 py-4"
              >
                <CheckCircle2 className="h-16 w-16 text-primary" />
                <h2 className="text-xl font-semibold">Reference Saved!</h2>
                <p className="text-sm text-muted-foreground text-center">
                  Your reference handwriting has been securely stored. You can now proceed to your dashboard.
                </p>
                <Button onClick={handleFinish} className="w-full h-12 rounded-xl mt-4">
                  Go to Dashboard
                </Button>
              </motion.div>
            ) : (
              <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                <div className="flex items-start gap-3 rounded-xl bg-primary/5 p-4 text-sm text-primary">
                  <Info className="h-5 w-5 shrink-0" />
                  <p>Upload 2-3 clear images of your own handwritten work for the best accuracy.</p>
                </div>

                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-primary/30 bg-secondary/30 p-8 transition-colors hover:border-primary/60 hover:bg-secondary/50"
                  disabled={uploading}
                >
                  <ImagePlus className="h-10 w-10 text-primary/60" />
                  <span className="text-sm font-medium text-muted-foreground">Select handwriting samples</span>
                </button>

                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                />

                {previews.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {previews.map((src, i) => (
                      <div key={i} className="relative group">
                        <img src={src} alt="Preview" className="h-20 w-full rounded-lg object-cover" />
                        <button
                          type="button"
                          onClick={() => removeFile(i)}
                          className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <Button variant="ghost" onClick={onClose} disabled={uploading} className="flex-1">
                    Skip
                  </Button>
                  <Button
                    onClick={handleUpload}
                    disabled={files.length === 0 || uploading}
                    className="flex-[2] h-11"
                  >
                    {uploading ? (
                      <span className="flex items-center gap-2">
                        <Upload className="h-4 w-4 animate-bounce" />
                        Uploading…
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Upload className="h-4 w-4" />
                        Save Reference {files.length > 0 ? `(${files.length})` : ""}
                      </span>
                    )}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReferenceUploadModal;

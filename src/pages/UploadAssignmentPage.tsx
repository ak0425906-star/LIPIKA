import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, CheckCircle2, ImagePlus, X, BookOpen, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { uploadAssignment, isAuthenticated } from "@/lib/api";

const UploadAssignmentPage = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploaded, setUploaded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

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
      // Upload each file to the backend
      if (isAuthenticated()) {
        for (const file of files) {
          await uploadAssignment(file);
        }
      }
      setUploaded(true);
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    previews.forEach((p) => URL.revokeObjectURL(p));
    setFiles([]);
    setPreviews([]);
    setUploaded(false);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mb-10 flex flex-col items-center gap-3"
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg">
          <BookOpen className="h-8 w-8 text-primary-foreground" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Upload Assignment</h1>
        <p className="text-sm text-muted-foreground">Upload images of your assignment below</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl shadow-primary/5"
      >
        <AnimatePresence mode="wait">
          {uploaded ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4 py-8"
            >
              <CheckCircle2 className="h-16 w-16 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">Uploaded Successfully!</h2>
              <p className="text-sm text-muted-foreground text-center">
                Your images have been uploaded and your account is created successfully!
              </p>
              <div className="mt-4 flex flex-col gap-3 w-full">
                <Button
                  onClick={() => {
                    toast.success("Images added successfully!");
                    setTimeout(() => navigate("/student-dashboard"), 1200);
                  }}
                  className="h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-base shadow-md shadow-primary/20 hover:opacity-90 transition-opacity"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
                <Button
                  onClick={handleReset}
                  variant="outline"
                  className="h-12 rounded-xl border-primary/30 text-primary font-semibold hover:bg-primary/5"
                >
                  Upload Another
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="upload"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-5"
            >
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-primary/30 bg-secondary/30 p-8 transition-colors hover:border-primary/60 hover:bg-secondary/50"
              >
                <ImagePlus className="h-10 w-10 text-primary/60" />
                <span className="text-sm font-medium text-muted-foreground">Tap to select images</span>
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
                <div className="grid grid-cols-3 gap-3">
                  {previews.map((src, i) => (
                    <div key={i} className="relative group">
                      <img src={src} alt={`Preview ${i + 1}`} className="h-24 w-full rounded-lg object-cover" />
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <Button
                onClick={handleUpload}
                disabled={files.length === 0 || uploading}
                className="mt-2 h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-base shadow-md shadow-primary/20 hover:opacity-90 transition-opacity"
              >
                {uploading ? (
                  <span className="flex items-center gap-2">
                    <Upload className="h-4 w-4 animate-bounce" />
                    Uploading…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    Upload {files.length > 0 ? `(${files.length})` : ""}
                  </span>
                )}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default UploadAssignmentPage;

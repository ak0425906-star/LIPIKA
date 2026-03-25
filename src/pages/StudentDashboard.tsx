import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, GraduationCap, LogOut, ImagePlus, CheckCircle2, X, Upload, Bell, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { getCurrentUser, isAuthenticated, logout, uploadAssignment } from "@/lib/api";

interface Assignment {
  name: string;
  description: string;
  dueDate: string;
  status: "Pending" | "Completed";
  verificationStatus?: "pending" | "accepted" | "rejected";
  teacher: string;
  matchPercent?: number;
  uploadedImages?: string[];
}

interface Subject {
  name: string;
  assignments: Assignment[];
}

interface Notification {
  id: string;
  message: string;
  type: "assignment" | "accepted" | "rejected" | "deadline";
  timestamp: string;
  read: boolean;
}

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [semester, setSemester] = useState<string>("6");
  const [fullName, setFullName] = useState("Student");
  const [department, setDepartment] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [expandedAssignment, setExpandedAssignment] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [previewImages, setPreviewImages] = useState<{ images: string[]; index: number } | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [uploadPreviews, setUploadPreviews] = useState<string[]>([]);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    if (!isAuthenticated()) { navigate("/"); return; }
    const user = getCurrentUser();
    if (!user || user.role !== "student") { navigate("/"); return; }
    setFullName(user.name || "Student");
    setDepartment(user.department || "");
    // Subjects start empty — will be populated from API
  }, [navigate]);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const activeSubject = subjects.find((s) => s.name === selectedSubject);

  const handleAssignmentClick = (assignmentName: string) => {
    setExpandedAssignment(expandedAssignment === assignmentName ? null : assignmentName);
    setUploadPreviews([]);
    setUploadFiles([]);
    setUploadingFor(null);
  };

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
    setUploadFiles((prev) => [...prev, ...newFiles]);
    setUploadPreviews((prev) => [...prev, ...newPreviews]);
  };

  const removePreview = (index: number) => {
    URL.revokeObjectURL(uploadPreviews[index]);
    setUploadFiles((prev) => prev.filter((_, i) => i !== index));
    setUploadPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUploadSubmit = async (subjectName: string, assignmentName: string) => {
    if (uploadFiles.length === 0) return;
    setUploadingFor(assignmentName);
    try {
      for (const file of uploadFiles) {
        await uploadAssignment(file);
      }
      setSubjects((prev) =>
        prev.map((s) =>
          s.name === subjectName
            ? {
                ...s,
                assignments: s.assignments.map((a) =>
                  a.name === assignmentName
                    ? { ...a, status: "Completed" as const, uploadedImages: uploadPreviews, verificationStatus: "pending" as const }
                    : a
                ),
              }
            : s
        )
      );
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setUploadingFor(null);
      setUploadFiles([]);
      setUploadPreviews([]);
    }
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const getVerificationBadge = (status?: "pending" | "accepted" | "rejected") => {
    if (!status) return null;
    if (status === "accepted") return <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-600">✓ Accepted</span>;
    if (status === "rejected") return <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-destructive/10 text-destructive">✗ Rejected</span>;
    return <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-600">⏳ Pending Review</span>;
  };

  return (
    <div className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto max-w-2xl">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-8 flex flex-col gap-5">
          <div className="flex justify-center">
            <h1 className="text-4xl font-extrabold tracking-widest text-primary drop-shadow-md">
              L<span className="text-foreground">I</span>P<span className="text-foreground">I</span>K<span className="text-foreground">A</span>
            </h1>
          </div>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg">
                <GraduationCap className="h-7 w-7 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground">{fullName}</h2>
                <p className="text-sm text-muted-foreground">{department}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Notification Bell */}
              <div className="relative">
                <Button variant="ghost" size="icon" onClick={() => setShowNotifications(!showNotifications)} className="text-muted-foreground hover:text-foreground relative">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
                      {unreadCount}
                    </span>
                  )}
                </Button>
              </div>
              <Select value={semester} onValueChange={setSemester}>
                <SelectTrigger className="w-[130px] rounded-xl bg-card shadow-sm border-border">
                  <SelectValue placeholder="Sem" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border shadow-lg z-50">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                    <SelectItem key={num} value={String(num)}>Sem {num}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" onClick={handleLogout} className="text-muted-foreground hover:text-foreground">
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Notification Panel */}
        <AnimatePresence>
          {showNotifications && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="mb-6">
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Notifications</CardTitle>
                    {unreadCount > 0 && (
                      <Button variant="ghost" size="sm" className="text-xs text-primary" onClick={markAllRead}>Mark all read</Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {notifications.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No notifications yet.</p>
                  ) : (
                    notifications.map((n) => (
                      <div key={n.id} className={`rounded-xl px-4 py-3 text-sm ${n.read ? "bg-secondary/30" : "bg-primary/5 border border-primary/20"}`}>
                        <p className="text-foreground">{n.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">{n.timestamp}</p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {subjects.length > 0 ? (
          <>
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15 }} className="mb-8 grid grid-cols-2 gap-4">
              {subjects.map((subject, i) => (
                <Card
                  key={i}
                  className={`border-0 shadow-md cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] ${selectedSubject === subject.name ? "ring-2 ring-primary" : ""}`}
                  onClick={() => { setSelectedSubject(selectedSubject === subject.name ? null : subject.name); setExpandedAssignment(null); }}
                >
                  <CardContent className="flex flex-col items-center gap-3 p-7">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <BookOpen className="h-7 w-7" />
                    </div>
                    <span className="text-sm font-semibold text-center text-foreground leading-tight">{subject.name}</span>
                    <span className="text-xs text-muted-foreground">{subject.assignments.length} assignment{subject.assignments.length !== 1 ? "s" : ""}</span>
                  </CardContent>
                </Card>
              ))}
            </motion.div>

            {activeSubject && (
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="mb-6">
                <Card className="border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <BookOpen className="h-5 w-5 text-primary" />
                      {activeSubject.name} — Assignments
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {activeSubject.assignments.map((item, i) => (
                      <div key={i}>
                        <div className="flex items-center justify-between rounded-xl bg-secondary/40 px-4 py-3 cursor-pointer hover:bg-secondary/60 transition-colors" onClick={() => handleAssignmentClick(item.name)}>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-medium text-foreground">{item.name}</span>
                            <span className="text-xs text-muted-foreground">{item.teacher}</span>
                            <span className="text-xs text-muted-foreground">Due: {new Date(item.dueDate).toLocaleDateString()}</span>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className={`text-xs font-semibold ${item.status === "Completed" ? "text-emerald-500" : "text-amber-500"}`}>
                              {item.status}
                            </span>
                            {item.status === "Completed" && getVerificationBadge(item.verificationStatus)}
                          </div>
                        </div>

                        <AnimatePresence>
                          {expandedAssignment === item.name && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                              <div className="mt-2 rounded-xl bg-card border border-border p-4">
                                {item.description && (
                                  <p className="text-xs text-muted-foreground mb-3 italic">{item.description}</p>
                                )}
                                {item.status === "Completed" ? (
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-2">Uploaded Images</p>
                                    {item.uploadedImages && item.uploadedImages.length > 0 ? (
                                      <div className="grid grid-cols-3 gap-2">
                                        {item.uploadedImages.map((src, idx) => (
                                          <img key={idx} src={src} alt={`Upload ${idx + 1}`} className="h-20 w-full rounded-lg object-cover cursor-pointer hover:opacity-80 transition-opacity" onClick={(e) => { e.stopPropagation(); setPreviewImages({ images: item.uploadedImages!, index: idx }); }} />
                                        ))}
                                      </div>
                                    ) : (
                                      <p className="text-xs text-muted-foreground italic">No images available for preview.</p>
                                    )}
                                  </div>
                                ) : (
                                  <div className="flex flex-col gap-3">
                                    {uploadingFor === item.name ? (
                                      <div className="flex flex-col items-center gap-2 py-4">
                                        <CheckCircle2 className="h-10 w-10 text-primary" />
                                        <p className="text-sm font-semibold text-foreground">Upload Completed!</p>
                                      </div>
                                    ) : (
                                      <>
                                        <button type="button" onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }} className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/30 bg-secondary/30 p-5 transition-colors hover:border-primary/60">
                                          <ImagePlus className="h-8 w-8 text-primary/60" />
                                          <span className="text-xs font-medium text-muted-foreground">Tap to select images</span>
                                        </button>
                                        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
                                        {uploadPreviews.length > 0 && (
                                          <div className="grid grid-cols-3 gap-2">
                                            {uploadPreviews.map((src, idx) => (
                                              <div key={idx} className="relative group">
                                                <img src={src} alt={`Preview ${idx + 1}`} className="h-20 w-full rounded-lg object-cover" />
                                                <button type="button" onClick={(e) => { e.stopPropagation(); removePreview(idx); }} className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100">
                                                  <X className="h-3 w-3" />
                                                </button>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                        <Button onClick={(e) => { e.stopPropagation(); handleUploadSubmit(activeSubject.name, item.name); }} disabled={uploadFiles.length === 0} className="h-10 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-md shadow-primary/20 hover:opacity-90 transition-opacity">
                                          <Upload className="h-4 w-4 mr-2" />
                                          Upload {uploadFiles.length > 0 ? `(${uploadFiles.length})` : ""}
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </>
        ) : (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center py-20 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground font-medium">No subjects or assignments available yet.</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Assignments will appear here when your teacher publishes them.</p>
          </motion.div>
        )}
      </div>

      {/* Image Carousel Dialog */}
      <Dialog open={!!previewImages} onOpenChange={() => setPreviewImages(null)}>
        <DialogContent className="max-w-3xl p-4 bg-background border-border">
          {previewImages && previewImages.images.length > 0 && (
            <div className="flex flex-col items-center gap-4">
              <div className="relative w-full flex items-center justify-center min-h-[40vh]">
                {previewImages.images.length > 1 && (
                  <Button variant="ghost" size="icon" onClick={() => setPreviewImages((prev) => prev ? { ...prev, index: Math.max(0, prev.index - 1) } : null)} disabled={previewImages.index === 0} className="absolute left-0 z-10">
                    <ChevronLeft className="h-6 w-6" />
                  </Button>
                )}
                <img src={previewImages.images[previewImages.index]} alt={`Image ${previewImages.index + 1}`} className="max-h-[65vh] w-auto rounded-lg object-contain" />
                {previewImages.images.length > 1 && (
                  <Button variant="ghost" size="icon" onClick={() => setPreviewImages((prev) => prev ? { ...prev, index: Math.min(prev.images.length - 1, prev.index + 1) } : null)} disabled={previewImages.index === previewImages.images.length - 1} className="absolute right-0 z-10">
                    <ChevronRight className="h-6 w-6" />
                  </Button>
                )}
              </div>
              <p className="text-sm text-muted-foreground">Image {previewImages.index + 1} of {previewImages.images.length}</p>
              <div className="flex gap-2 overflow-x-auto max-w-full pb-2">
                {previewImages.images.map((src, i) => (
                  <img
                    key={i}
                    src={src}
                    alt={`Thumb ${i + 1}`}
                    className={`h-14 w-14 rounded-lg object-cover cursor-pointer border-2 transition-all ${i === previewImages.index ? "border-primary" : "border-transparent opacity-60 hover:opacity-100"}`}
                    onClick={() => setPreviewImages((prev) => prev ? { ...prev, index: i } : null)}
                  />
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StudentDashboard;

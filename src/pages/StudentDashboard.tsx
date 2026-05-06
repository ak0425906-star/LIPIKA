import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, GraduationCap, LogOut, ImagePlus, CheckCircle2, X, Upload, Bell, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { getCurrentUser, isAuthenticated, logout, uploadAssignment, getStudentSubjects, getStudentAssignments } from "@/lib/api";

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

    const loadData = async () => {
      try {
        const [apiSubjects, apiAssignments] = await Promise.all([
          getStudentSubjects(),
          getStudentAssignments()
        ]);

        // Transform and group assignments by subject
        const formattedSubjects: Subject[] = apiSubjects.map(subj => {
          const assignments = apiAssignments
            .filter(a => a.subject_name === subj.name)
            .map(a => ({
              name: a.subject_name || "Assignment",
              description: "Uploaded handwriting assignment", // Generic as backend doesn't store descriptions yet
              dueDate: a.date.split(" ")[0],
              status: (a.status.toLowerCase() === "pending" ? "Pending" : "Completed") as "Pending" | "Completed",
              verificationStatus: a.status.toLowerCase() as "pending" | "accepted" | "rejected",
              teacher: "Assigned Teacher",
              matchPercent: a.similarity,
              uploadedImages: [a.image_url]
            }));

          return {
            name: subj.name,
            assignments: assignments
          };
        });

        setSubjects(formattedSubjects);
      } catch (err) {
        console.error("Failed to load student data", err);
      }
    };

    loadData();
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

        <AnimatePresence mode="wait">
          {!selectedSubject ? (
            subjects.length > 0 ? (
              <motion.div 
                key="grid"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-2 gap-4"
              >
                {subjects.map((subject, i) => (
                  <Card
                    key={i}
                    className="group border-0 shadow-md cursor-pointer transition-all hover:shadow-xl hover:scale-[1.03] active:scale-[0.98] bg-card/80 backdrop-blur-sm"
                    onClick={() => { setSelectedSubject(subject.name); setExpandedAssignment(null); }}
                  >
                    <CardContent className="flex flex-col items-center gap-4 p-8">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                        <BookOpen className="h-8 w-8" />
                      </div>
                      <div className="text-center">
                        <h3 className="text-base font-bold text-foreground leading-tight">{subject.name}</h3>
                        <p className="text-xs text-muted-foreground mt-1">{subject.assignments.length} Total Assignments</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </motion.div>
            ) : (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                className="flex flex-col items-center justify-center py-24 text-center bg-card/30 rounded-3xl border border-dashed border-border"
              >
                <div className="h-20 w-20 rounded-full bg-secondary/50 flex items-center justify-center mb-6">
                  <BookOpen className="h-10 w-10 text-muted-foreground/40" />
                </div>
                <p className="text-lg font-bold text-foreground">No subjects found</p>
                <p className="text-sm text-muted-foreground mt-2 max-w-[250px]">Your subjects will appear here once assigned by the teacher for Sem {semester}.</p>
              </motion.div>
            )
          ) : activeSubject && (
            <motion.div 
              key="details"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Detailed View Header */}
              <div className="flex items-center justify-between bg-card/50 p-4 rounded-2xl border border-border/50 backdrop-blur-sm">
                <div className="flex items-center gap-4">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setSelectedSubject(null)}
                    className="h-10 w-10 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </Button>
                  <div>
                    <h2 className="text-xl font-black tracking-tight text-foreground uppercase">{activeSubject.name}</h2>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Semester {semester} Dashboard</span>
                    </div>
                  </div>
                </div>
              </div>

              <Card className="border-0 shadow-2xl shadow-primary/5 bg-card/80 backdrop-blur-md overflow-hidden">
                <CardHeader className="border-b border-border/50 bg-secondary/20">
                  <CardTitle className="flex items-center gap-3 text-lg font-bold">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <BookOpen className="h-5 w-5 text-primary" />
                    </div>
                    Current Assignments
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-8">
                  {/* Pending Assignments */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-border/50 pb-2">
                      <h3 className="text-xs font-black text-amber-600 uppercase tracking-[0.2em] flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                        Pending Submissions
                      </h3>
                      <span className="text-[10px] font-bold bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-full">
                        {activeSubject.assignments.filter(a => a.status === "Pending").length} Action Required
                      </span>
                    </div>
                    
                    {activeSubject.assignments.filter(a => a.status === "Pending").length > 0 ? (
                      activeSubject.assignments.filter(a => a.status === "Pending").map((item, i) => (
                        <div key={i} className="group">
                          <div 
                            className={`flex items-center justify-between rounded-2xl border transition-all p-5 cursor-pointer ${expandedAssignment === item.name ? "bg-primary/5 border-primary/30 shadow-lg shadow-primary/5" : "bg-secondary/40 border-transparent hover:border-primary/20 hover:bg-secondary/60 shadow-sm"}`}
                            onClick={() => handleAssignmentClick(item.name)}
                          >
                            <div className="flex items-center gap-4">
                              <div className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${expandedAssignment === item.name ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"}`}>
                                <Upload className="h-5 w-5" />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-sm font-black text-foreground">{item.name}</span>
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Deadline: {new Date(item.dueDate).toLocaleDateString()}</span>
                              </div>
                            </div>
                            <Button variant={expandedAssignment === item.name ? "secondary" : "default"} size="sm" className="h-9 rounded-xl px-5 text-xs font-black shadow-md">
                              {expandedAssignment === item.name ? "Cancel" : "Upload"}
                            </Button>
                          </div>

                          <AnimatePresence>
                            {expandedAssignment === item.name && (
                              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                                <div className="mt-3 rounded-2xl bg-background/50 border border-border/50 p-6 space-y-5">
                                  <div className="space-y-1">
                                    <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Assignment Brief</h4>
                                    <p className="text-xs text-foreground/80 leading-relaxed italic">{item.description}</p>
                                  </div>

                                  <div className="flex flex-col gap-4">
                                    {uploadingFor === item.name ? (
                                      <div className="flex flex-col items-center gap-4 py-8 bg-primary/5 rounded-2xl border border-primary/20">
                                        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full" />
                                        <p className="text-sm font-black text-primary animate-pulse">Syncing with Server...</p>
                                      </div>
                                    ) : (
                                      <>
                                        <button 
                                          type="button" 
                                          onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }} 
                                          className="flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-primary/20 bg-primary/5 p-10 transition-all hover:border-primary/50 hover:bg-primary/10 group/drop"
                                        >
                                          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-background shadow-xl text-primary transition-transform group-hover/drop:scale-110 group-hover/drop:rotate-6">
                                            <ImagePlus className="h-7 w-7" />
                                          </div>
                                          <div className="text-center space-y-1">
                                            <span className="block text-sm font-black text-foreground">Tap to add handwriting samples</span>
                                            <span className="text-[10px] text-primary/70 font-bold uppercase tracking-[0.1em]">No File Limit — Upload multiple for accuracy</span>
                                          </div>
                                        </button>
                                        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
                                        
                                        {uploadPreviews.length > 0 && (
                                          <div className="grid grid-cols-3 gap-4">
                                            {uploadPreviews.map((src, idx) => (
                                              <div key={idx} className="relative aspect-square group/preview">
                                                <img src={src} alt={`Preview ${idx + 1}`} className="h-full w-full rounded-xl object-cover shadow-md ring-2 ring-transparent transition-all group-hover/preview:ring-primary" />
                                                <button type="button" onClick={(e) => { e.stopPropagation(); removePreview(idx); }} className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-xl hover:scale-125 transition-transform active:scale-95">
                                                  <X className="h-4 w-4" />
                                                </button>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                        
                                        <Button 
                                          onClick={(e) => { e.stopPropagation(); handleUploadSubmit(activeSubject.name, item.name); }} 
                                          disabled={uploadFiles.length === 0} 
                                          className="h-12 w-full rounded-xl bg-primary text-primary-foreground font-black shadow-xl shadow-primary/30 hover:shadow-primary/50 transition-all active:scale-[0.98]"
                                        >
                                          <Upload className="h-5 w-5 mr-3" />
                                          Submit {uploadFiles.length > 0 ? `${uploadFiles.length} Handwriting Samples` : "Final Submission"}
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))
                    ) : (
                      <div className="py-6 text-center bg-secondary/20 rounded-2xl border border-dashed border-border/50">
                        <CheckCircle2 className="h-8 w-8 text-emerald-500/30 mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground font-bold italic uppercase tracking-wider">All caught up! No pending work.</p>
                      </div>
                    )}
                  </div>

                  {/* Completed Assignments */}
                  <div className="space-y-4 pt-4">
                    <div className="flex items-center justify-between border-b border-border/50 pb-2">
                      <h3 className="text-xs font-black text-emerald-600 uppercase tracking-[0.2em] flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        Completed Records
                      </h3>
                      <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full">
                        {activeSubject.assignments.filter(a => a.status === "Completed").length} Verified
                      </span>
                    </div>

                    {activeSubject.assignments.filter(a => a.status === "Completed").length > 0 ? (
                      activeSubject.assignments.filter(a => a.status === "Completed").map((item, i) => (
                        <div key={i} className="group">
                          <div 
                            className={`flex items-center justify-between rounded-2xl border transition-all p-5 cursor-pointer ${expandedAssignment === item.name ? "bg-emerald-500/5 border-emerald-500/30" : "bg-emerald-500/10 border-transparent hover:bg-emerald-500/15"}`}
                            onClick={() => handleAssignmentClick(item.name)}
                          >
                            <div className="flex flex-col gap-1">
                              <span className="text-sm font-black text-foreground">{item.name}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black bg-emerald-500/20 text-emerald-700 px-1.5 py-0.5 rounded-md uppercase tracking-wider">Success</span>
                                <span className="text-[10px] text-muted-foreground font-bold">Ref: {new Date(item.dueDate).toLocaleDateString()}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              {getVerificationBadge(item.verificationStatus)}
                              <div className={`h-8 w-8 rounded-full flex items-center justify-center transition-colors ${expandedAssignment === item.name ? "bg-emerald-500 text-white" : "bg-emerald-500/20 text-emerald-600"}`}>
                                <CheckCircle2 className="h-4 w-4" />
                              </div>
                            </div>
                          </div>

                          <AnimatePresence>
                            {expandedAssignment === item.name && (
                              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                                <div className="mt-3 rounded-2xl bg-background/50 border border-border/50 p-6 space-y-6">
                                  <div className="flex items-center justify-between">
                                    <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                      <ImagePlus className="h-3 w-3" />
                                      Digital Reference Archive
                                    </h4>
                                    <span className="text-[9px] font-black bg-secondary px-2 py-1 rounded-lg shadow-sm tracking-tighter uppercase">{item.uploadedImages?.length || 0} Files Locked</span>
                                  </div>

                                  {item.uploadedImages && item.uploadedImages.length > 0 ? (
                                    <div className="grid grid-cols-3 gap-4">
                                      {item.uploadedImages.map((src, idx) => (
                                        <div key={idx} className="relative aspect-square group/img cursor-pointer overflow-hidden rounded-xl shadow-md transition-transform hover:scale-105 active:scale-95" onClick={(e) => { e.stopPropagation(); setPreviewImages({ images: item.uploadedImages!, index: idx }); }}>
                                          <img src={src} alt={`Upload ${idx + 1}`} className="h-full w-full object-cover ring-1 ring-border" />
                                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity flex items-end p-2">
                                            <span className="text-[9px] text-white font-black uppercase tracking-widest">Enlarge</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="py-12 text-center border-2 border-dashed border-border/40 rounded-3xl bg-secondary/5">
                                      <X className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
                                      <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">No visual records found</p>
                                    </div>
                                  )}
                                  
                                  <Button 
                                    variant="ghost" 
                                    className="w-full h-11 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-destructive/5 hover:text-destructive transition-colors" 
                                    onClick={(e) => { e.stopPropagation(); setExpandedAssignment(null); }}
                                  >
                                    Collapse Archive View
                                  </Button>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))
                    ) : (
                      <div className="py-8 text-center bg-secondary/10 rounded-2xl border border-dashed border-border/50">
                        <p className="text-xs text-muted-foreground font-bold italic uppercase tracking-wider">No completed records found for this term.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
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

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, LogOut, Search, Users, Plus, Calendar, UserX, Eye, Check, X, UserCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import { getCurrentUser, isAuthenticated, logout, getTeacherAssignments } from "@/lib/api";

// Types
interface StudentSubmission {
  studentId: string;
  studentName: string;
  assignmentName: string;
  dateSubmitted: string;
  dueDate: string;
  matchPercent: number;
  uploadedImages: string[];
  status: "pending" | "accepted" | "rejected";
}

interface AssignmentDef {
  name: string;
  description: string;
  dueDate: string;
}

interface SubjectData {
  name: string;
  assignments: AssignmentDef[];
  submissions: StudentSubmission[];
  allStudentIds: string[];
}

type FilterType = "all" | "strong" | "moderate" | "weak" | "not-submitted" | "submitted" | "rejected";

// Helpers
const getMatchStatus = (percent: number): { label: string; color: string } => {
  if (percent > 74) return { label: "Strong Match", color: "text-emerald-500" };
  if (percent >= 50) return { label: "Moderate Match", color: "text-amber-500" };
  return { label: "Weak Match", color: "text-red-500" };
};

const isLateSubmission = (submittedDate: string, dueDate: string): boolean => {
  return new Date(submittedDate) > new Date(dueDate);
};

// Components
const AddAssignmentDialog = ({ open, onClose, onAdd }: {
  open: boolean;
  onClose: () => void;
  onAdd: (a: AssignmentDef) => void;
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");

  const handleSubmit = () => {
    if (!name || !dueDate) return;
    onAdd({ name, description, dueDate });
    setName(""); setDescription(""); setDueDate("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Add New Assignment</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 pt-2">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">Assignment Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter assignment name" className="rounded-xl bg-secondary/50 border-0" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Enter assignment description" className="rounded-xl bg-secondary/50 border-0 min-h-[80px]" />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">Submission Date</Label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="rounded-xl bg-secondary/50 border-0" />
          </div>
          <Button onClick={handleSubmit} disabled={!name || !dueDate} className="rounded-xl">
            <Plus className="h-4 w-4 mr-2" /> Create Assignment
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const ImageCarouselDialog = ({ open, onClose, studentName, images }: {
  open: boolean;
  onClose: () => void;
  studentName: string;
  images: string[];
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const goNext = () => setCurrentIndex((prev) => Math.min(prev + 1, images.length - 1));
  const goPrev = () => setCurrentIndex((prev) => Math.max(prev - 1, 0));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">{studentName} — Uploaded Assignment</DialogTitle>
        </DialogHeader>
        {images.length > 0 ? (
          <div className="flex flex-col items-center gap-4 pt-2">
            <div className="relative w-full flex items-center justify-center">
              {images.length > 1 && (
                <Button variant="ghost" size="icon" onClick={goPrev} disabled={currentIndex === 0} className="absolute left-0 z-10">
                  <ChevronLeft className="h-6 w-6" />
                </Button>
              )}
              <img src={images[currentIndex]} alt={`Page ${currentIndex + 1}`} className="max-h-[60vh] w-auto rounded-lg object-contain border border-border" />
              {images.length > 1 && (
                <Button variant="ghost" size="icon" onClick={goNext} disabled={currentIndex === images.length - 1} className="absolute right-0 z-10">
                  <ChevronRight className="h-6 w-6" />
                </Button>
              )}
            </div>
            <p className="text-sm text-muted-foreground">Page {currentIndex + 1} of {images.length}</p>
            {/* Thumbnail strip */}
            <div className="flex gap-2 overflow-x-auto max-w-full pb-2">
              {images.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt={`Thumb ${i + 1}`}
                  className={`h-14 w-14 rounded-lg object-cover cursor-pointer border-2 transition-all ${i === currentIndex ? "border-primary" : "border-transparent opacity-60 hover:opacity-100"}`}
                  onClick={() => setCurrentIndex(i)}
                />
              ))}
            </div>
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">No images uploaded.</p>
        )}
      </DialogContent>
    </Dialog>
  );
};  // Main Component
const TeacherDashboard = () => {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("Teacher");
  const [department, setDepartment] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addForSubject, setAddForSubject] = useState<string | null>(null);
  const [viewStudent, setViewStudent] = useState<{ name: string; images: string[] } | null>(null);

  const [subjectsData, setSubjectsData] = useState<SubjectData[]>([]);

  useEffect(() => {
    if (!isAuthenticated()) { navigate("/"); return; }
    const user = getCurrentUser();
    if (!user || user.role !== "teacher") { navigate("/"); return; }
    setFullName(user.name || "Teacher");
    setDepartment(user.department || "Computer Science");

    const loadData = async () => {
      setLoading(true);
      try {
        const response = await getTeacherAssignments();
        const data = response.data || [];
        
        // Group by subject
        const subjectsMap: Record<string, SubjectData> = {};
        
        data.forEach((sub: any) => {
          const sName = sub.subject_name || "Unassigned";
          if (!subjectsMap[sName]) {
            subjectsMap[sName] = {
              name: sName,
              assignments: [],
              submissions: [],
              allStudentIds: []
            };
          }
          
          // Add to submissions
          subjectsMap[sName].submissions.push({
            studentId: sub.roll_number || "N/A",
            studentName: sub.student_name || "N/A",
            assignmentName: sub.subject_name || "Assignment",
            dateSubmitted: sub.date.split(" ")[0],
            dueDate: sub.date.split(" ")[0], // Mock due date as same as submission date for now
            matchPercent: sub.similarity,
            uploadedImages: [sub.image_url],
            status: sub.status as "pending" | "accepted" | "rejected"
          });
          
          if (!subjectsMap[sName].allStudentIds.includes(sub.roll_number)) {
            subjectsMap[sName].allStudentIds.push(sub.roll_number);
          }

          // Create assignment def if not exists
          if (!subjectsMap[sName].assignments.find(a => a.name === (sub.subject_name || "Assignment"))) {
            subjectsMap[sName].assignments.push({
              name: sub.subject_name || "Assignment",
              description: "Student submission",
              dueDate: sub.date.split(" ")[0]
            });
          }
        });

        const formattedData = Object.values(subjectsMap);
        setSubjectsData(formattedData);
        
        if (formattedData.length > 0) {
          setSelectedSubject(formattedData[0].name);
          if (formattedData[0].assignments.length > 0) {
            setSelectedAssignment(formattedData[0].assignments[0].name);
          }
        }
      } catch (err) {
        console.error("Failed to load teacher data", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [navigate]);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const handleAddAssignment = (assignment: AssignmentDef) => {
    if (!addForSubject) return;
    setSubjectsData((prev) => prev.map((s) => s.name === addForSubject ? { ...s, assignments: [...s.assignments, assignment] } : s));
  };

  const handleAcceptReject = (studentId: string, assignmentName: string, newStatus: "accepted" | "rejected") => {
    setSubjectsData((prev) =>
      prev.map((s) => ({
        ...s,
        submissions: s.submissions.map((sub) =>
          sub.studentId === studentId && sub.assignmentName === assignmentName
            ? { ...sub, status: newStatus }
            : sub
        ),
      }))
    );
  };

  const activeSubjectData = subjectsData.find((s) => s.name === selectedSubject);
  const assignmentSubmissions = useMemo(() => {
    if (!activeSubjectData || !selectedAssignment) return [];
    return activeSubjectData.submissions.filter((s) => s.assignmentName === selectedAssignment);
  }, [activeSubjectData, selectedAssignment]);

  const selectedAssignmentDef = activeSubjectData?.assignments.find((a) => a.name === selectedAssignment);

  // Statistics Calculation
  const stats = useMemo(() => {
    if (!selectedAssignment || !activeSubjectData) return { totalSubmissions: 0, strong: 0, moderate: 0, weak: 0, pending: 0 };
    const submitted = assignmentSubmissions;
    const totalSubmissions = submitted.length;
    const strong = submitted.filter(s => s.matchPercent > 74).length;
    const moderate = submitted.filter(s => s.matchPercent >= 50 && s.matchPercent <= 74).length;
    const weak = submitted.filter(s => s.matchPercent < 50).length;
    
    const submittedIds = new Set(submitted.map(s => s.studentId));
    const pending = activeSubjectData.allStudentIds.filter(id => !submittedIds.has(id)).length;
    
    return { totalSubmissions, strong, moderate, weak, pending };
  }, [assignmentSubmissions, selectedAssignment, activeSubjectData]);

  const filteredSubmissions = useMemo(() => {
    let list = assignmentSubmissions;
    if (filter === "strong") list = list.filter((s) => s.matchPercent > 74);
    else if (filter === "moderate") list = list.filter((s) => s.matchPercent >= 50 && s.matchPercent <= 74);
    else if (filter === "weak") list = list.filter((s) => s.matchPercent < 50);
    else if (filter === "not-submitted") return []; // Handled separately in the UI

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((s) => s.studentId.toLowerCase().includes(q) || s.studentName.toLowerCase().includes(q));
    }
    return list;
  }, [assignmentSubmissions, filter, searchQuery]);

  const notSubmittedList = useMemo(() => {
    if (!activeSubjectData || !selectedAssignment) return [];
    const submittedIds = new Set(assignmentSubmissions.map(s => s.studentId));
    let list = activeSubjectData.allStudentIds.filter(id => !submittedIds.has(id));
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(id => id.toLowerCase().includes(q));
    }
    return list;
  }, [activeSubjectData, assignmentSubmissions, selectedAssignment, searchQuery]);

  const filters: { key: FilterType; label: string; count?: number }[] = [
    { key: "all", label: "All Results" },
    { key: "strong", label: "Strong Match", count: stats.strong },
    { key: "moderate", label: "Moderate Match", count: stats.moderate },
    { key: "weak", label: "Weak Match", count: stats.weak },
    { key: "not-submitted", label: "Not Submitted", count: stats.pending },
  ];

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground">Loading dashboard...</p></div>;

  return (
    <div className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto max-w-6xl">
        {/* Header omitted for brevity in replace call, but it's there */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-10 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary shadow-2xl shadow-primary/30 text-white">
              <Users className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tighter text-foreground uppercase">Teacher Dashboard</h1>
              <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">{department} — Faculty Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right mr-4 hidden sm:block">
              <p className="text-sm font-black text-foreground">{fullName}</p>
              <p className="text-[10px] font-bold text-muted-foreground uppercase">Active Session</p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="h-12 w-12 rounded-2xl bg-secondary hover:bg-destructive hover:text-white transition-all">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <Card className="border-0 shadow-xl bg-card overflow-hidden group">
            <CardContent className="p-8 relative">
              <div className="flex justify-between items-start mb-4">
                <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Total Submitted</p>
                <Users className="h-6 w-6 text-muted-foreground/30 group-hover:scale-110 transition-transform" />
              </div>
              <p className="text-5xl font-black text-foreground mb-1">{stats.totalSubmissions}</p>
              <p className="text-xs text-muted-foreground font-semibold uppercase">Assignments Received</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl bg-emerald-500 text-white overflow-hidden group">
            <CardContent className="p-8 relative">
              <div className="flex justify-between items-start mb-4">
                <p className="text-sm font-bold opacity-80 uppercase tracking-wider">Strong Match</p>
                <UserCheck className="h-6 w-6 opacity-40 group-hover:scale-110 transition-transform" />
              </div>
              <p className="text-5xl font-black mb-1">{stats.strong}</p>
              <p className="text-xs opacity-70 font-semibold uppercase">Similarity Score &gt; 74%</p>
              <Check className="absolute -bottom-4 -right-4 h-24 w-24 opacity-10" />
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl bg-amber-500 text-white overflow-hidden group">
            <CardContent className="p-8 relative">
              <div className="flex justify-between items-start mb-4">
                <p className="text-sm font-bold opacity-80 uppercase tracking-wider">Moderate Match</p>
                <Calendar className="h-6 w-6 opacity-40 group-hover:scale-110 transition-transform" />
              </div>
              <p className="text-5xl font-black mb-1">{stats.moderate}</p>
              <p className="text-xs opacity-70 font-semibold uppercase">Score between 50% - 74%</p>
              <Plus className="absolute -bottom-4 -right-4 h-24 w-24 opacity-10 rotate-45" />
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl bg-red-500 text-white overflow-hidden group">
            <CardContent className="p-8 relative">
              <div className="flex justify-between items-start mb-4">
                <p className="text-sm font-bold opacity-80 uppercase tracking-wider">Weak Match</p>
                <UserX className="h-6 w-6 opacity-40 group-hover:scale-110 transition-transform" />
              </div>
              <p className="text-5xl font-black mb-1">{stats.weak}</p>
              <p className="text-xs opacity-70 font-semibold uppercase">Similarity Score &lt; 50%</p>
              <X className="absolute -bottom-4 -right-4 h-24 w-24 opacity-10" />
            </CardContent>
          </Card>
        </div>

        {/* Selection Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          <Card className="border-0 shadow-md col-span-1 lg:col-span-2 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black uppercase tracking-widest text-foreground">Course Overview</h3>
                <Button variant="outline" size="sm" onClick={() => { setAddForSubject(selectedSubject); setShowAddDialog(true); }} className="h-8 rounded-xl text-[10px] font-black uppercase tracking-wider border-primary/20 text-primary hover:bg-primary/5">
                  <Plus className="h-3 w-3 mr-1" /> Add Assignment
                </Button>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {subjectsData.map((s, i) => (
                  <Button 
                    key={i} 
                    variant={selectedSubject === s.name ? "default" : "secondary"} 
                    className={`rounded-2xl h-24 px-8 flex flex-col gap-1 transition-all ${selectedSubject === s.name ? "shadow-lg shadow-primary/20 scale-105" : "bg-secondary/40 hover:bg-secondary/60"}`}
                    onClick={() => { setSelectedSubject(s.name); setSelectedAssignment(null); }}
                  >
                    <BookOpen className="h-5 w-5 mb-1" />
                    <span className="text-sm font-black">{s.name}</span>
                    <span className="text-[10px] opacity-60 uppercase">{s.assignments.length} Tasks</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md bg-card/50 backdrop-blur-sm">
            <CardContent className="p-6">
              <h3 className="text-sm font-black uppercase tracking-widest text-foreground mb-4">Select Task</h3>
              <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2">
                {activeSubjectData?.assignments.map((a, i) => (
                  <div 
                    key={i} 
                    className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${selectedAssignment === a.name ? "bg-primary text-primary-foreground shadow-md" : "bg-secondary/40 hover:bg-secondary/60"}`}
                    onClick={() => setSelectedAssignment(a.name)}
                  >
                    <span className="text-xs font-bold">{a.name}</span>
                    <ChevronRight className={`h-4 w-4 opacity-50 ${selectedAssignment === a.name ? "rotate-90" : ""}`} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Verification Results Table */}
        <AnimatePresence mode="wait">
          {selectedAssignment && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} transition={{ duration: 0.4 }}>
              <Card className="border-0 shadow-2xl bg-card overflow-hidden">
                <div className="bg-secondary/20 px-8 py-6 border-b border-border/50">
                  <h3 className="text-xl font-black text-foreground uppercase tracking-tight">Verification Results</h3>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1 tracking-[0.2em]">{selectedAssignment} — Review Panel</p>
                </div>
                <CardContent className="p-8">
                  <div className="flex flex-col lg:flex-row items-center justify-between gap-6 mb-8">
                    <div className="flex gap-2 flex-wrap justify-center lg:justify-start">
                      {filters.map((f) => (
                        <Button
                          key={f.key}
                          variant={filter === f.key ? "default" : "outline"}
                          size="sm"
                          className={`rounded-xl px-4 h-9 text-[10px] font-black uppercase tracking-wider transition-all ${filter === f.key ? "shadow-lg shadow-primary/20 scale-105" : "bg-secondary/30 border-transparent hover:bg-secondary/50"}`}
                          onClick={() => setFilter(f.key)}
                        >
                          {f.label}
                          {f.count !== undefined && <span className="ml-2 opacity-50">[{f.count}]</span>}
                        </Button>
                      ))}
                    </div>
                    <div className="relative w-full lg:max-w-xs">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search student or ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-12 h-11 rounded-2xl bg-secondary/30 border-0 text-sm font-medium focus-visible:ring-primary/30"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border/50">
                          <th className="text-left px-4 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Student ID</th>
                          <th className="text-left px-4 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Student Name</th>
                          <th className="text-left px-4 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Date</th>
                          <th className="text-left px-4 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">Score</th>
                          <th className="text-left px-4 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Status</th>
                          <th className="text-center px-4 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                        {filter === "not-submitted" ? (
                          notSubmittedList.length === 0 ? (
                            <tr><td colSpan={6} className="text-center py-20 text-muted-foreground font-bold italic uppercase text-xs tracking-widest">All students have submitted!</td></tr>
                          ) : (
                            notSubmittedList.map((id, idx) => (
                              <tr key={idx} className="group hover:bg-secondary/10 transition-all">
                                <td className="px-4 py-5 text-sm font-black text-foreground/70">{id}</td>
                                <td className="px-4 py-5 text-sm font-bold text-muted-foreground italic">No Name Available</td>
                                <td className="px-4 py-5 text-sm font-bold text-destructive uppercase">Pending</td>
                                <td className="px-4 py-5 text-center text-sm font-black text-muted-foreground">--</td>
                                <td className="px-4 py-5">
                                  <span className="text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-sm bg-destructive/10 text-destructive">
                                    Not Submitted
                                  </span>
                                </td>
                                <td className="px-4 py-5 text-center">
                                  <Button variant="ghost" size="sm" className="opacity-30 cursor-not-allowed">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </td>
                              </tr>
                            ))
                          )
                        ) : filteredSubmissions.length === 0 ? (
                          <tr><td colSpan={6} className="text-center py-20 text-muted-foreground font-bold italic uppercase text-xs tracking-widest">No matching results in current view</td></tr>
                        ) : (
                          filteredSubmissions.map((sub, idx) => {
                            const match = getMatchStatus(sub.matchPercent);
                            const late = isLateSubmission(sub.dateSubmitted, sub.dueDate);
                            return (
                              <tr key={idx} className="group hover:bg-secondary/10 transition-all">
                                <td className="px-4 py-5 text-sm font-black text-foreground/70">{sub.studentId}</td>
                                <td className="px-4 py-5">
                                  <span className="text-sm font-black text-foreground group-hover:text-primary transition-colors">{sub.studentName}</span>
                                </td>
                                <td className="px-4 py-5">
                                  <div className="flex flex-col">
                                    <span className="text-xs font-bold text-foreground">{sub.dateSubmitted}</span>
                                    {late && <span className="text-[9px] font-black text-destructive uppercase tracking-tighter mt-0.5">Late Submission</span>}
                                  </div>
                                </td>
                                <td className="px-4 py-5 text-center">
                                  <span className={`text-sm font-black ${match.color}`}>{sub.matchPercent}%</span>
                                </td>
                                <td className="px-4 py-5">
                                  <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-sm ${match.color.replace("text-", "bg-")}/10 ${match.color}`}>
                                    {match.label}
                                  </span>
                                </td>
                                <td className="px-4 py-5">
                                  <div className="flex items-center justify-center gap-2">
                                    <Button variant="ghost" size="icon" onClick={() => setViewStudent({ name: sub.studentName, images: sub.uploadedImages })} className="h-8 w-8 rounded-lg bg-primary/5 text-primary hover:bg-primary hover:text-white transition-all">
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleAcceptReject(sub.studentId, sub.assignmentName, "accepted")} className={`h-8 w-8 rounded-lg transition-all ${sub.status === "accepted" ? "bg-emerald-500 text-white shadow-lg shadow-emerald-200" : "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white"}`}>
                                      <Check className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleAcceptReject(sub.studentId, sub.assignmentName, "rejected")} className={`h-8 w-8 rounded-lg transition-all ${sub.status === "rejected" ? "bg-destructive text-white shadow-lg shadow-red-200" : "bg-destructive/10 text-destructive hover:bg-destructive hover:text-white"}`}>
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AddAssignmentDialog open={showAddDialog} onClose={() => setShowAddDialog(false)} onAdd={handleAddAssignment} />
      {viewStudent && <ImageCarouselDialog open={!!viewStudent} onClose={() => setViewStudent(null)} studentName={viewStudent.name} images={viewStudent.images} />}
    </div>
  );
};

export default TeacherDashboard;

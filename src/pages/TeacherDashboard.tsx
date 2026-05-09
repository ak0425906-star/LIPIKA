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
import { getCurrentUser, isAuthenticated, logout, getTeacherAssignments, getTeacherSubjects, getTeacherTasks, createTeacherTask, deleteTeacherTask, reviewAssignment } from "@/lib/api";

// Types
interface StudentSubmission {
  id: number;
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
  id?: number;
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
const getMatchStatus = (percent: number): { label: string; color: string; interpretation: string } => {
  if (percent >= 85) return { label: "Strong Match", color: "text-emerald-500", interpretation: "Authenticated" };
  if (percent >= 60) return { label: "Moderate Match", color: "text-amber-500", interpretation: "Needs Review" };
  return { label: "Weak Match", color: "text-red-500", interpretation: "Flagged" };
};

const isLateSubmission = (submittedDate: string, dueDate: string): boolean => {
  return new Date(submittedDate) > new Date(dueDate);
};

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Components
const AddAssignmentDialog = ({ open, onClose, onAdd, subjects, defaultSubject }: {
  open: boolean;
  onClose: () => void;
  onAdd: (a: AssignmentDef, subjectName: string) => void;
  subjects: string[];
  defaultSubject: string;
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [selectedSub, setSelectedSub] = useState(defaultSubject);

  useEffect(() => {
    if (open) {
      setSelectedSub(defaultSubject);
    }
  }, [open, defaultSubject]);

  const handleSubmit = () => {
    if (!name || !dueDate || !selectedSub) return;
    onAdd({ name, description, dueDate }, selectedSub);
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
          {subjects.length > 1 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Select Subject</Label>
              <Select value={selectedSub} onValueChange={setSelectedSub}>
                <SelectTrigger className="rounded-xl bg-secondary/50 border-0">
                  <SelectValue placeholder="Choose a subject" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {subjects.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
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
          <Button onClick={handleSubmit} disabled={!name || !dueDate || !selectedSub} className="rounded-xl">
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
      <DialogContent className="max-w-5xl bg-slate-900/95 backdrop-blur-xl border-white/10 p-0 overflow-hidden rounded-[2rem] shadow-2xl">
        <div className="relative w-full h-[85vh] flex flex-col">
          <div className="p-6 flex items-center justify-between border-b border-white/5">
            <DialogTitle className="text-xl font-black text-white uppercase tracking-tight">{studentName} — Submissions</DialogTitle>
            <div className="flex items-center gap-4">
              {images.length > 1 && (
                <span className="px-3 py-1 bg-white/10 rounded-lg text-[10px] font-black text-white/50 uppercase tracking-widest">
                  {currentIndex + 1} / {images.length}
                </span>
              )}
              <Button variant="ghost" size="icon" onClick={onClose} className="h-10 w-10 rounded-full bg-white/5 hover:bg-white/10 text-white">
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
          
          <div className="flex-1 relative group">
            <div className="absolute inset-0 overflow-y-auto p-4 flex flex-col items-center">
              <motion.img 
                key={currentIndex}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                src={images[currentIndex]} 
                alt={`Page ${currentIndex + 1}`} 
                className="w-full h-auto max-w-4xl shadow-2xl ring-1 ring-white/10" 
              />
            </div>

            {images.length > 1 && (
              <>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={goPrev} 
                  disabled={currentIndex === 0} 
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-20 h-14 w-14 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/10 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-0"
                >
                  <ChevronLeft className="h-8 w-8" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={goNext} 
                  disabled={currentIndex === images.length - 1} 
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-20 h-14 w-14 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/10 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-0"
                >
                  <ChevronRight className="h-8 w-8" />
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};  // Main Component
const TeacherDashboard = () => {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("Teacher");
  const [department, setDepartment] = useState("");
  const [expandedSubmission, setExpandedSubmission] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
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
        const [assignmentsRes, subjectsRes, tasksRes] = await Promise.all([
          getTeacherAssignments(),
          getTeacherSubjects(),
          getTeacherTasks()
        ]);

        const submissions = assignmentsRes.data || [];
        const assignedSubjects = subjectsRes || [];
        const allTasks = tasksRes || [];
        
        // Group by subject
        const subjectsMap: Record<string, SubjectData> = {};
        
        // Initialize map with all assigned subjects
        assignedSubjects.forEach(sName => {
          subjectsMap[sName] = {
            name: sName,
            assignments: [],
            submissions: [],
            allStudentIds: []
          };
        });

        // Add real tasks to subjects
        allTasks.forEach((t: any) => {
          const sName = t.subject_name;
          if (subjectsMap[sName]) {
            subjectsMap[sName].assignments.push({
              id: t.id,
              name: t.name,
              description: t.description || "",
              dueDate: t.due_date
            });
          }
        });

        submissions.forEach((sub: any) => {
          const sName = sub.subject_name || "Unassigned";
          
          if (!subjectsMap[sName]) {
            subjectsMap[sName] = {
              name: sName,
              assignments: [],
              submissions: [],
              allStudentIds: []
            };
          }
          
          const taskName = sub.task_name || sub.subject_name || "Assignment";

          // Add to submissions
          subjectsMap[sName].submissions.push({
            id: sub.id,
            studentId: sub.roll_number || "N/A",
            studentName: sub.student_name || "N/A",
            assignmentName: taskName,
            dateSubmitted: sub.date.split(" ")[0],
            dueDate: sub.date.split(" ")[0], 
            matchPercent: sub.similarity,
            uploadedImages: [sub.image_url],
            status: sub.status as "pending" | "accepted" | "rejected"
          });
          
          if (!subjectsMap[sName].allStudentIds.includes(sub.roll_number)) {
            subjectsMap[sName].allStudentIds.push(sub.roll_number);
          }

          // Fallback: If task doesn't exist in assignments list, add it (for old data)
          if (!subjectsMap[sName].assignments.find(a => a.name === taskName)) {
            subjectsMap[sName].assignments.push({
              name: taskName,
              description: "Legacy submission",
              dueDate: sub.date.split(" ")[0]
            });
          }
        });

        const formattedData = Object.values(subjectsMap);
        setSubjectsData(formattedData);
        
        if (formattedData.length > 0) {
          // 1. Determine Subject
          let targetSub = formattedData[0];
          if (selectedSubject) {
            const found = formattedData.find(s => s.name === selectedSubject);
            if (found) targetSub = found;
          }
          
          if (selectedSubject !== targetSub.name) {
            setSelectedSubject(targetSub.name);
          }

          // 2. Determine Assignment/Task
          if (targetSub.assignments.length > 0) {
            if (!selectedAssignment || !targetSub.assignments.find(a => a.name === selectedAssignment)) {
              setSelectedAssignment(targetSub.assignments[0].name);
            }
          } else {
            setSelectedAssignment(null);
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

  const handleAddAssignment = async (assignment: AssignmentDef, subjectName: string) => {
    try {
      await createTeacherTask({
        name: assignment.name,
        description: assignment.description,
        due_date: assignment.dueDate,
        subject_name: subjectName
      });
      // Refresh all data to get the new task and updated lists
      window.location.reload(); 
    } catch (err) {
      console.error("Failed to create task", err);
      alert("Failed to create task: " + err);
    }
  };


  /**
   * Submits a review (Accept/Reject) for a specific assignment to the backend
   * and updates the local dashboard state.
   */
  const handleAcceptReject = async (assignmentId: number, newStatus: "accepted" | "rejected") => {
    try {
      // 1. Persist the change to the backend database
      await reviewAssignment(assignmentId, newStatus);
      
      // 2. Update the UI state to reflect the new status immediately
      setSubjectsData((prevData) =>
        prevData.map((subject) => ({
          ...subject,
          submissions: subject.submissions.map((sub) =>
            sub.id === assignmentId ? { ...sub, status: newStatus } : sub
          ),
        }))
      );
      
      console.log(`Successfully updated assignment ${assignmentId} to ${newStatus}`);
    } catch (err) {
      console.error("Critical failure during assignment review:", err);
      alert("System Error: Could not synchronize review status with the server.");
    }
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
    const strong = submitted.filter(s => s.matchPercent >= 85).length;
    const moderate = submitted.filter(s => s.matchPercent >= 60 && s.matchPercent < 85).length;
    const weak = submitted.filter(s => s.matchPercent < 60).length;
    
    const submittedIds = new Set(submitted.map(s => s.studentId));
    const pending = activeSubjectData.allStudentIds.filter(id => !submittedIds.has(id)).length;
    
    return { totalSubmissions, strong, moderate, weak, pending };
  }, [assignmentSubmissions, selectedAssignment, activeSubjectData]);

  const filteredSubmissions = useMemo(() => {
    let list = assignmentSubmissions;
    if (filter === "strong") list = list.filter((s) => s.matchPercent >= 85);
    else if (filter === "moderate") list = list.filter((s) => s.matchPercent >= 60 && s.matchPercent < 85);
    else if (filter === "weak") list = list.filter((s) => s.matchPercent < 60);
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
              <p className="text-xs opacity-70 font-semibold uppercase">Similarity Score ≥ 85%</p>
              <p className="text-[10px] opacity-50 font-bold uppercase tracking-widest mt-1">Authenticated</p>
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
              <p className="text-xs opacity-70 font-semibold uppercase">Score between 60% - 84%</p>
              <p className="text-[10px] opacity-50 font-bold uppercase tracking-widest mt-1">Needs Review</p>
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
              <p className="text-xs opacity-70 font-semibold uppercase">Similarity Score &lt; 60%</p>
              <p className="text-[10px] opacity-50 font-bold uppercase tracking-widest mt-1">Flagged</p>
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
                                  <div className="flex flex-col items-start gap-1">
                                    <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-sm ${match.color.replace("text-", "bg-")}/10 ${match.color}`}>
                                      {match.label}
                                    </span>
                                    <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-tighter ml-1">
                                      {match.interpretation}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-4 py-5">
                                  <div className="flex items-center justify-center gap-2">
                                    <Button variant="ghost" size="icon" onClick={() => setViewStudent({ name: sub.studentName, images: sub.uploadedImages })} className="h-8 w-8 rounded-lg bg-primary/5 text-primary hover:bg-primary hover:text-white transition-all">
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleAcceptReject(sub.id, "accepted")} className={`h-8 w-8 rounded-lg transition-all ${sub.status === "accepted" ? "bg-emerald-500 text-white shadow-lg shadow-emerald-200" : "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white"}`}>
                                      <Check className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleAcceptReject(sub.id, "rejected")} className={`h-8 w-8 rounded-lg transition-all ${sub.status === "rejected" ? "bg-destructive text-white shadow-lg shadow-red-200" : "bg-destructive/10 text-destructive hover:bg-destructive hover:text-white"}`}>
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

      <AddAssignmentDialog 
        open={showAddDialog} 
        onClose={() => setShowAddDialog(false)} 
        onAdd={handleAddAssignment} 
        subjects={subjectsData.map(s => s.name)}
        defaultSubject={selectedSubject || ""}
      />
      {viewStudent && <ImageCarouselDialog open={!!viewStudent} onClose={() => setViewStudent(null)} studentName={viewStudent.name} images={viewStudent.images} />}
      
      <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 border-0 bg-transparent shadow-none overflow-hidden flex items-center justify-center">
          {previewImage && (
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }}
              className="relative w-full h-full flex items-center justify-center p-4"
            >
              <img 
                src={previewImage} 
                alt="Full Preview" 
                className="max-w-full max-h-full object-contain rounded-3xl shadow-2xl ring-4 ring-white/20" 
              />
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setPreviewImage(null)}
                className="absolute top-8 right-8 h-12 w-12 rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-md transition-all border border-white/20 z-50"
              >
                <X className="h-6 w-6" />
              </Button>
            </motion.div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeacherDashboard;

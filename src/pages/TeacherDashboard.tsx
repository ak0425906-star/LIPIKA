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
  if (percent >= 78) return { label: "Strong Match", color: "text-emerald-500" };
  if (percent >= 58) return { label: "Moderate Match", color: "text-amber-500" };
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
};

// Main Component
const TeacherDashboard = () => {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("Teacher");
  const [department, setDepartment] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [subjectsData, setSubjectsData] = useState<SubjectData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addForSubject, setAddForSubject] = useState<string | null>(null);
  const [viewStudent, setViewStudent] = useState<{ name: string; images: string[] } | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) { navigate("/"); return; }
    const user = getCurrentUser();
    if (!user || user.role !== "teacher") { navigate("/"); return; }
    setFullName(user.name || "Teacher");
    setDepartment(user.department || "");

    // Load from API — start with empty data
    const loadData = async () => {
      try {
        const data = await getTeacherAssignments();
        // TODO: Map API response to SubjectData when API returns structured data
        if (data && Array.isArray(data)) {
          // Map API data if available
        }
      } catch {
        // API not available — dashboard starts empty
      }
      // Start with empty subjects — data comes from API
      setSubjectsData([]);
      setLoading(false);
    };
    loadData();
  }, [navigate]);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const handleAddAssignment = (assignment: AssignmentDef) => {
    if (!addForSubject) return;
    setSubjectsData((prev) => {
      const existing = prev.find((s) => s.name === addForSubject);
      if (existing) {
        return prev.map((s) =>
          s.name === addForSubject
            ? { ...s, assignments: [...s.assignments, assignment] }
            : s
        );
      }
      // Create new subject entry if it doesn't exist
      return [...prev, {
        name: addForSubject,
        assignments: [assignment],
        submissions: [],
        allStudentIds: [],
      }];
    });
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

  // Filter submissions for the selected assignment
  const assignmentSubmissions = useMemo(() => {
    if (!activeSubjectData || !selectedAssignment) return [];
    return activeSubjectData.submissions.filter((s) => s.assignmentName === selectedAssignment);
  }, [activeSubjectData, selectedAssignment]);

  const selectedAssignmentDef = activeSubjectData?.assignments.find((a) => a.name === selectedAssignment);

  // Not-submitted students
  const notSubmittedStudents = useMemo(() => {
    if (!selectedAssignment || !activeSubjectData) return [];
    const submittedIds = new Set(assignmentSubmissions.map((s) => s.studentId));
    return activeSubjectData.allStudentIds.filter((id) => !submittedIds.has(id));
  }, [assignmentSubmissions, selectedAssignment, activeSubjectData]);

  // Submitted students
  const submittedStudents = useMemo(() => {
    return assignmentSubmissions.filter((s) => s.status !== "rejected");
  }, [assignmentSubmissions]);

  // Rejected students
  const rejectedStudents = useMemo(() => {
    return assignmentSubmissions.filter((s) => s.status === "rejected");
  }, [assignmentSubmissions]);

  const filteredSubmissions = useMemo(() => {
    if (filter === "not-submitted" || filter === "submitted" || filter === "rejected") return [];
    let list = assignmentSubmissions;
    if (filter === "strong") list = list.filter((s) => s.matchPercent >= 78);
    else if (filter === "moderate") list = list.filter((s) => s.matchPercent >= 58 && s.matchPercent < 78);
    else if (filter === "weak") list = list.filter((s) => s.matchPercent < 58);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((s) => s.studentId.toLowerCase().includes(q) || s.studentName.toLowerCase().includes(q));
    }
    return list;
  }, [assignmentSubmissions, filter, searchQuery]);

  const getSubjectStats = (data: SubjectData) => {
    const total = data.submissions.length;
    const strong = data.submissions.filter((s) => s.matchPercent >= 78).length;
    const moderate = data.submissions.filter((s) => s.matchPercent >= 58 && s.matchPercent < 78).length;
    const weak = data.submissions.filter((s) => s.matchPercent < 58).length;
    return { total, strong, moderate, weak };
  };

  const filters: { key: FilterType; label: string; count?: number }[] = [
    { key: "all", label: "All Results" },
    { key: "strong", label: "Strong Match" },
    { key: "moderate", label: "Moderate Match" },
    { key: "weak", label: "Weak Match" },
    { key: "not-submitted", label: "Not Submitted", count: notSubmittedStudents.length },
    { key: "submitted", label: "Submitted", count: submittedStudents.length },
    { key: "rejected", label: "Rejected", count: rejectedStudents.length },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-8 flex flex-col gap-5">
          <div className="flex justify-center">
            <h1 className="text-4xl font-extrabold tracking-widest text-primary drop-shadow-md">
              L<span className="text-foreground">I</span>P<span className="text-foreground">I</span>K<span className="text-foreground">A</span>
            </h1>
          </div>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg">
                <Users className="h-7 w-7 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground">{fullName}</h2>
                <p className="text-sm text-muted-foreground">{department}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="text-muted-foreground hover:text-foreground">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </motion.div>

        {/* Subject Cards */}
        {subjectsData.length === 0 ? (
          <Card className="border-0 shadow-md">
            <CardContent className="p-10 text-center">
              <p className="text-muted-foreground mb-4">No subjects or assignments yet.</p>
              <Button onClick={() => { setAddForSubject("New Subject"); setShowAddDialog(true); }} className="rounded-xl">
                <Plus className="h-4 w-4 mr-2" /> Add Your First Assignment
              </Button>
            </CardContent>
          </Card>
        ) : (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15 }} className="mb-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {subjectsData.map((subject, i) => {
              const stats = getSubjectStats(subject);
              const isSelected = selectedSubject === subject.name;
              return (
                <div key={i} className="flex gap-3">
                  <Card
                    className={`flex-1 border-0 shadow-md cursor-pointer transition-all hover:shadow-lg hover:scale-[1.01] ${isSelected ? "ring-2 ring-primary" : ""}`}
                    onClick={() => { setSelectedSubject(isSelected ? null : subject.name); setSelectedAssignment(null); setFilter("all"); setSearchQuery(""); }}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-center gap-3 mb-3">
                        <BookOpen className="h-5 w-5 text-primary" />
                        <span className="text-sm font-bold text-foreground">{subject.name}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-lg bg-secondary/50 p-2 text-center">
                          <p className="text-xl font-bold text-foreground">{stats.total}</p>
                          <p className="text-[10px] text-muted-foreground">Total</p>
                        </div>
                        <div className="rounded-lg bg-emerald-500/10 p-2 text-center">
                          <p className="text-xl font-bold text-emerald-500">{stats.strong}</p>
                          <p className="text-[10px] text-emerald-600">Strong</p>
                        </div>
                        <div className="rounded-lg bg-amber-500/10 p-2 text-center">
                          <p className="text-xl font-bold text-amber-500">{stats.moderate}</p>
                          <p className="text-[10px] text-amber-600">Moderate</p>
                        </div>
                        <div className="rounded-lg bg-red-500/10 p-2 text-center">
                          <p className="text-xl font-bold text-red-500">{stats.weak}</p>
                          <p className="text-[10px] text-red-600">Weak</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card
                    className="w-16 border-0 shadow-md cursor-pointer transition-all hover:shadow-lg hover:scale-105 flex items-center justify-center bg-primary/5 hover:bg-primary/10"
                    onClick={(e) => { e.stopPropagation(); setAddForSubject(subject.name); setShowAddDialog(true); }}
                  >
                    <CardContent className="p-0 flex flex-col items-center gap-1">
                      <Plus className="h-6 w-6 text-primary" />
                      <span className="text-[10px] font-semibold text-primary">Add</span>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </motion.div>
        )}

        {/* Assignment List for selected subject */}
        {activeSubjectData && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="mb-6">
            <Card className="border-0 shadow-md">
              <CardContent className="p-5">
                <h3 className="text-base font-bold text-foreground mb-3">Assignments — {activeSubjectData.name}</h3>
                <div className="space-y-2">
                  {activeSubjectData.assignments.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No assignments yet. Click "Add" to create one.</p>
                  ) : (
                    activeSubjectData.assignments.map((a, i) => {
                      const submissionCount = activeSubjectData.submissions.filter((s) => s.assignmentName === a.name).length;
                      const isActive = selectedAssignment === a.name;
                      return (
                        <div
                          key={i}
                          className={`flex items-center justify-between rounded-xl px-4 py-3 cursor-pointer transition-colors ${isActive ? "bg-primary/10 ring-1 ring-primary" : "bg-secondary/40 hover:bg-secondary/60"}`}
                          onClick={() => { setSelectedAssignment(isActive ? null : a.name); setFilter("all"); }}
                        >
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-medium text-foreground">{a.name}</span>
                            <span className="text-xs text-muted-foreground">{a.description}</span>
                          </div>
                          <div className="flex flex-col items-end gap-0.5">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" /> Due: {new Date(a.dueDate).toLocaleDateString()}
                            </span>
                            <span className="text-xs font-semibold text-primary">{submissionCount} submitted</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Verification Results Table */}
        {selectedAssignment && activeSubjectData && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <Card className="border-0 shadow-lg">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-foreground mb-4">Verification Results — {selectedAssignment}</h3>

                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                  <div className="flex gap-2 flex-wrap">
                    {filters.map((f) => (
                      <Button
                        key={f.key}
                        variant={filter === f.key ? "default" : "outline"}
                        size="sm"
                        className={`rounded-xl text-xs ${f.key === "not-submitted" ? "border-destructive/30 text-destructive hover:bg-destructive/5" : ""} ${f.key === "rejected" ? "border-destructive/30 text-destructive hover:bg-destructive/5" : ""} ${f.key === "submitted" ? "border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/5" : ""}`}
                        onClick={() => setFilter(f.key)}
                      >
                        {f.key === "not-submitted" && <UserX className="h-3 w-3 mr-1" />}
                        {f.key === "submitted" && <UserCheck className="h-3 w-3 mr-1" />}
                        {f.key === "rejected" && <X className="h-3 w-3 mr-1" />}
                        {f.label}
                        {f.count !== undefined && ` (${f.count})`}
                      </Button>
                    ))}
                  </div>
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by Student ID or Name"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 h-9 rounded-xl bg-secondary/50 border-0 text-sm"
                    />
                  </div>
                </div>

                {/* Not Submitted List */}
                <AnimatePresence>
                  {filter === "not-submitted" && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <div className="overflow-x-auto rounded-xl border border-destructive/20">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-destructive/5">
                              <th className="text-left px-4 py-3 font-semibold text-foreground">Student ID</th>
                              <th className="text-left px-4 py-3 font-semibold text-foreground">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {notSubmittedStudents.length === 0 ? (
                              <tr><td colSpan={2} className="text-center py-8 text-muted-foreground">All students have submitted!</td></tr>
                            ) : (
                              notSubmittedStudents.map((id, idx) => (
                                <tr key={idx} className="border-t border-destructive/10 hover:bg-destructive/5 transition-colors">
                                  <td className="px-4 py-3 text-foreground">{id}</td>
                                  <td className="px-4 py-3 font-semibold text-destructive">Not Submitted</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submitted Students List */}
                <AnimatePresence>
                  {filter === "submitted" && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <div className="overflow-x-auto rounded-xl border border-emerald-500/20">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-emerald-500/5">
                              <th className="text-left px-4 py-3 font-semibold text-foreground">Student ID</th>
                              <th className="text-left px-4 py-3 font-semibold text-foreground">Student Name</th>
                              <th className="text-left px-4 py-3 font-semibold text-foreground">Date Submitted</th>
                              <th className="text-left px-4 py-3 font-semibold text-foreground">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {submittedStudents.length === 0 ? (
                              <tr><td colSpan={4} className="text-center py-8 text-muted-foreground">No submissions yet.</td></tr>
                            ) : (
                              submittedStudents.map((sub, idx) => {
                                const late = selectedAssignmentDef ? isLateSubmission(sub.dateSubmitted, selectedAssignmentDef.dueDate) : false;
                                return (
                                  <tr key={idx} className="border-t border-emerald-500/10 hover:bg-emerald-500/5 transition-colors">
                                    <td className="px-4 py-3 text-foreground">{sub.studentId}</td>
                                    <td className="px-4 py-3 text-foreground">{sub.studentName}</td>
                                    <td className={`px-4 py-3 font-medium ${late ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                                      {sub.dateSubmitted}
                                      {late && <span className="ml-1 text-[10px]">(Late)</span>}
                                    </td>
                                    <td className="px-4 py-3">
                                      <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${sub.status === "accepted" ? "bg-emerald-500/10 text-emerald-600" : sub.status === "rejected" ? "bg-destructive/10 text-destructive" : "bg-amber-500/10 text-amber-600"}`}>
                                        {sub.status === "accepted" ? "Accepted" : sub.status === "rejected" ? "Rejected" : "Pending"}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Rejected Students List */}
                <AnimatePresence>
                  {filter === "rejected" && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <div className="overflow-x-auto rounded-xl border border-destructive/20">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-destructive/5">
                              <th className="text-left px-4 py-3 font-semibold text-foreground">Student ID</th>
                              <th className="text-left px-4 py-3 font-semibold text-foreground">Student Name</th>
                              <th className="text-left px-4 py-3 font-semibold text-foreground">Date Submitted</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rejectedStudents.length === 0 ? (
                              <tr><td colSpan={3} className="text-center py-8 text-muted-foreground">No rejected submissions.</td></tr>
                            ) : (
                              rejectedStudents.map((sub, idx) => (
                                <tr key={idx} className="border-t border-destructive/10 hover:bg-destructive/5 transition-colors">
                                  <td className="px-4 py-3 text-foreground">{sub.studentId}</td>
                                  <td className="px-4 py-3 text-foreground">{sub.studentName}</td>
                                  <td className="px-4 py-3 text-muted-foreground">{sub.dateSubmitted}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Main Submitted Results with Accept/Reject */}
                {filter !== "not-submitted" && filter !== "submitted" && filter !== "rejected" && (
                  <div className="overflow-x-auto rounded-xl border border-border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-secondary/40">
                          <th className="text-left px-4 py-3 font-semibold text-foreground">Student ID</th>
                          <th className="text-left px-4 py-3 font-semibold text-foreground">Student Name</th>
                          <th className="text-left px-4 py-3 font-semibold text-foreground">Date Submitted</th>
                          <th className="text-left px-4 py-3 font-semibold text-foreground">Score</th>
                          <th className="text-left px-4 py-3 font-semibold text-foreground">Match</th>
                          <th className="text-left px-4 py-3 font-semibold text-foreground">View</th>
                          <th className="text-left px-4 py-3 font-semibold text-foreground">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSubmissions.length === 0 ? (
                          <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">No results found.</td></tr>
                        ) : (
                          filteredSubmissions.map((sub, idx) => {
                            const status = getMatchStatus(sub.matchPercent);
                            const late = selectedAssignmentDef ? isLateSubmission(sub.dateSubmitted, selectedAssignmentDef.dueDate) : false;
                            return (
                              <tr key={idx} className="border-t border-border hover:bg-secondary/20 transition-colors">
                                <td className="px-4 py-3 text-foreground">{sub.studentId}</td>
                                <td
                                  className="px-4 py-3 text-primary font-medium cursor-pointer hover:underline"
                                  onClick={() => setViewStudent({ name: sub.studentName, images: sub.uploadedImages })}
                                >
                                  {sub.studentName}
                                </td>
                                <td className={`px-4 py-3 font-medium ${late ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                                  {sub.dateSubmitted}
                                  {late && <span className="ml-1 text-[10px]">(Late)</span>}
                                </td>
                                <td className="px-4 py-3 font-semibold text-foreground">{sub.matchPercent}%</td>
                                <td className={`px-4 py-3 font-semibold ${status.color}`}>{status.label}</td>
                                <td className="px-4 py-3">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2"
                                    onClick={() => setViewStudent({ name: sub.studentName, images: sub.uploadedImages })}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex gap-1">
                                    <Button
                                      variant={sub.status === "accepted" ? "default" : "outline"}
                                      size="sm"
                                      className={`h-7 w-7 p-0 rounded-full ${sub.status === "accepted" ? "bg-emerald-500 hover:bg-emerald-600 text-white" : "border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"}`}
                                      onClick={() => handleAcceptReject(sub.studentId, sub.assignmentName, "accepted")}
                                      title="Accept"
                                    >
                                      <Check className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant={sub.status === "rejected" ? "default" : "outline"}
                                      size="sm"
                                      className={`h-7 w-7 p-0 rounded-full ${sub.status === "rejected" ? "bg-destructive hover:bg-destructive/90 text-white" : "border-destructive/30 text-destructive hover:bg-destructive/10"}`}
                                      onClick={() => handleAcceptReject(sub.studentId, sub.assignmentName, "rejected")}
                                      title="Reject"
                                    >
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
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Dialogs */}
      <AddAssignmentDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onAdd={handleAddAssignment}
      />

      {viewStudent && (
        <ImageCarouselDialog
          open={!!viewStudent}
          onClose={() => setViewStudent(null)}
          studentName={viewStudent.name}
          images={viewStudent.images}
        />
      )}
    </div>
  );
};

export default TeacherDashboard;

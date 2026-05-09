import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, BookOpen, GraduationCap, LogOut, Search, Plus, Trash2, Upload, X, Shield, Eye, Check, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { 
  getCurrentUser, 
  isAuthenticated, 
  logout, 
  getAdminStudents, 
  getAdminTeachers, 
  getAdminSubjects, 
  getStudentReferences, 
  addStudentReference, 
  updateStudentReference,
  deleteStudentReference, 
  assignTeacherSubjects,
  createAdminSubject,
  deleteAdminSubject,
  deleteAdminStudent,
  deleteAdminTeacher,
  type UserOut 
} from "@/lib/api";

interface StudentData {
  username: string;
  rollNumber: string;
  name: string;
  department: string;
  year: string;
}

interface TeacherData {
  username: string;
  name: string;
  department: string;
  subjects: string[];
}

interface SubjectData {
  id: number;
  name: string;
  department: string;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"students" | "teachers">("students");
  
  const [students, setStudents] = useState<StudentData[]>([]);
  const [teachers, setTeachers] = useState<TeacherData[]>([]);
  const [subjects, setSubjects] = useState<SubjectData[]>([]);
  
  // Selection states
  const [selectedStudent, setSelectedStudent] = useState<StudentData | null>(null);
  const [studentRefs, setStudentRefs] = useState<{ id: number; image_url: string }[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isUploadingRef, setIsUploadingRef] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherData | null>(null);
  const [showSubjectDialog, setShowSubjectDialog] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");

  // Search states
  const [searchQuery, setSearchQuery] = useState("");

  // Dialog open states
  const [showStudentDialog, setShowStudentDialog] = useState(false);
  const [showTeacherDialog, setShowTeacherDialog] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) { navigate("/"); return; }
    const user = getCurrentUser();
    if (!user || user.role !== "admin") { navigate("/"); return; }

    loadAllData();
  }, [navigate]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [sData, tData, subData] = await Promise.all([
        getAdminStudents(),
        getAdminTeachers(),
        getAdminSubjects()
      ]);
      
      setStudents(sData.map(s => ({
        username: s.username,
        rollNumber: s.roll_number || "",
        name: s.name,
        department: s.department || "",
        year: s.year || ""
      })));
      
      setTeachers(tData);
      setSubjects(subData);
    } catch (error) {
      console.error("Failed to load admin data", error);
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  // --- Student Management ---
  const handleViewStudent = async (student: StudentData) => {
    setSelectedStudent(student);
    setShowStudentDialog(true);
    try {
      const refs = await getStudentReferences(student.username);
      setStudentRefs(refs);
    } catch (error) {
      console.error("Failed to fetch references", error);
    }
  };

  const handleAddReference = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedStudent || !e.target.files || e.target.files.length === 0) return;
    
    setIsUploadingRef(true);
    const files = Array.from(e.target.files);
    
    try {
      // Process each file
      for (const file of files) {
        await addStudentReference(selectedStudent.username, file);
      }
      
      const refs = await getStudentReferences(selectedStudent.username);
      setStudentRefs(refs);
      toast.success(`Successfully added ${files.length} reference(s)`);
    } catch (error) {
      console.error("Failed to add reference", error);
      toast.error("Failed to upload references");
    } finally {
      setIsUploadingRef(false);
      // Reset input
      e.target.value = "";
    }
  };

  const handleDeleteReference = async (refId: number) => {
    if (!selectedStudent) return;
    try {
      await deleteStudentReference(selectedStudent.username, refId);
      setStudentRefs(prev => prev.filter(r => r.id !== refId));
    } catch (error) {
      console.error("Failed to delete reference", error);
    }
  };

  const handleUpdateReference = async (refId: number, file: File) => {
    if (!selectedStudent) return;
    try {
      await updateStudentReference(selectedStudent.username, refId, file);
      const refs = await getStudentReferences(selectedStudent.username);
      setStudentRefs(refs);
    } catch (error) {
      console.error("Failed to update reference", error);
    }
  };

  const handleDeleteStudent = async () => {
    if (!selectedStudent) return;
    if (!window.confirm(`Are you sure you want to delete the student ${selectedStudent.name} and all their data? This cannot be undone.`)) return;
    try {
      await deleteAdminStudent(selectedStudent.username);
      setStudents(prev => prev.filter(s => s.username !== selectedStudent.username));
      setShowStudentDialog(false);
      setSelectedStudent(null);
      toast.success("Student deleted successfully");
    } catch (error) {
      console.error("Failed to delete student", error);
      toast.error("Failed to delete student");
    }
  };

  // --- Teacher/Subject Management ---
  const handleAssignSubject = async (subjectId: number) => {
    if (!selectedTeacher) return;
    
    // Toggle logic
    const currentSubjectNames = selectedTeacher.subjects;
    const clickedSubject = subjects.find(s => s.id === subjectId);
    if (!clickedSubject) return;

    let newSubjectIds: number[] = [];
    const isAssigned = currentSubjectNames.includes(clickedSubject.name);
    
    // Map current names to IDs
    const currentSubjectIds = subjects
      .filter(s => currentSubjectNames.includes(s.name))
      .map(s => s.id);

    if (isAssigned) {
      newSubjectIds = currentSubjectIds.filter(id => id !== subjectId);
    } else {
      newSubjectIds = [...currentSubjectIds, subjectId];
    }

    try {
      await assignTeacherSubjects(selectedTeacher.username, newSubjectIds);
      // Refresh teacher list
      const tData = await getAdminTeachers();
      setTeachers(tData);
      // Update local selection
      const updatedTeacher = tData.find(t => t.username === selectedTeacher.username);
      if (updatedTeacher) setSelectedTeacher(updatedTeacher);
    } catch (error) {
      console.error("Failed to assign subject", error);
    }
  };

  const handleDeleteTeacher = async () => {
    if (!selectedTeacher) return;
    if (!window.confirm(`Are you sure you want to delete the teacher ${selectedTeacher.name}? This cannot be undone.`)) return;
    try {
      await deleteAdminTeacher(selectedTeacher.username);
      setTeachers(prev => prev.filter(t => t.username !== selectedTeacher.username));
      setShowTeacherDialog(false);
      setSelectedTeacher(null);
      toast.success("Teacher deleted successfully");
    } catch (error) {
      console.error("Failed to delete teacher", error);
      toast.error("Failed to delete teacher");
    }
  };

  const handleDeleteSubject = async (subjectId: number, subjectName: string) => {
    if (!window.confirm(`Are you sure you want to delete the subject "${subjectName}" globally? It will be removed from all assigned teachers.`)) return;
    try {
      await deleteAdminSubject(subjectId);
      setSubjects(prev => prev.filter(s => s.id !== subjectId));
      
      // Update teachers list locally to remove the deleted subject
      setTeachers(prev => prev.map(t => ({
        ...t,
        subjects: t.subjects.filter(s => s !== subjectName)
      })));
      
      // Also update selectedTeacher if they have the subject
      if (selectedTeacher && selectedTeacher.subjects.includes(subjectName)) {
        setSelectedTeacher({
          ...selectedTeacher,
          subjects: selectedTeacher.subjects.filter(s => s !== subjectName)
        });
      }
      toast.success("Subject deleted successfully");
    } catch (error) {
      console.error("Failed to delete subject", error);
      toast.error("Failed to delete subject");
    }
  };

  const handleCreateSubject = async () => {
    if (!newSubjectName.trim()) return;
    try {
      const user = getCurrentUser();
      await createAdminSubject(newSubjectName, user?.department || "General");
      const subData = await getAdminSubjects();
      setSubjects(subData);
      setNewSubjectName("");
      setShowSubjectDialog(false);
    } catch (error) {
      console.error("Failed to create subject", error);
    }
  };

  const filteredList = useMemo(() => {
    const q = searchQuery.toLowerCase();
    if (activeTab === "students") {
      return students.filter(s => s.name.toLowerCase().includes(q) || s.rollNumber.toLowerCase().includes(q));
    } else {
      return teachers.filter(t => t.name.toLowerCase().includes(q) || t.username.toLowerCase().includes(q));
    }
  }, [activeTab, students, teachers, searchQuery]);

  const handleViewTeacher = (teacher: TeacherData) => {
    setSelectedTeacher(teacher);
    setShowTeacherDialog(true);
  };

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center font-bold uppercase tracking-widest text-muted-foreground">Initializing Admin Portal...</div>;

  return (
    <div className="min-h-screen bg-[#F8FAFC] px-6 py-10">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-[2rem] bg-slate-900 shadow-2xl shadow-slate-200">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">Admin Console</h1>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.3em] mt-1">Management Interface — {getCurrentUser()?.department}</p>
            </div>
          </div>
          <Button variant="ghost" onClick={handleLogout} className="h-12 w-12 rounded-2xl bg-white shadow-sm border border-slate-100 text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex gap-4 mb-8">
          <Button 
            onClick={() => { setActiveTab("students"); setSearchQuery(""); }}
            className={`h-14 px-8 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-3 ${activeTab === "students" ? "bg-slate-900 text-white shadow-xl scale-105" : "bg-white text-slate-400 hover:bg-slate-50"}`}
          >
            <GraduationCap className="h-4 w-4" /> Student Records
            <span className={`px-2 py-0.5 rounded-lg text-[10px] ${activeTab === "students" ? "bg-white/20" : "bg-slate-100"}`}>{students.length}</span>
          </Button>
          <Button 
            onClick={() => { setActiveTab("teachers"); setSearchQuery(""); }}
            className={`h-14 px-8 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-3 ${activeTab === "teachers" ? "bg-slate-900 text-white shadow-xl scale-105" : "bg-white text-slate-400 hover:bg-slate-50"}`}
          >
            <Users className="h-4 w-4" /> Faculty Access
            <span className={`px-2 py-0.5 rounded-lg text-[10px] ${activeTab === "teachers" ? "bg-white/20" : "bg-slate-100"}`}>{teachers.length}</span>
          </Button>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Main List */}
          <div className="flex items-center justify-between mb-4 px-4">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em]">
              {activeTab === "students" ? "Total Enrolled Students" : "Faculty Members"}
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Showing</span>
              <span className="px-3 py-1 bg-white border border-slate-100 rounded-xl text-xs font-black text-slate-900 shadow-sm">{filteredList.length}</span>
            </div>
          </div>
          <Card className="border-0 shadow-2xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden bg-white">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                <Input 
                  placeholder={activeTab === "students" ? "Search student ID or name..." : "Search faculty name..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 h-12 bg-slate-50/50 border-0 rounded-2xl text-sm font-bold placeholder:text-slate-300 focus-visible:ring-slate-200"
                />
              </div>
              {activeTab === "teachers" && (
                <Button onClick={() => setShowSubjectDialog(true)} className="h-12 w-12 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-200">
                  <Plus className="h-5 w-5" />
                </Button>
              )}
            </div>
            <CardContent className="p-0 max-h-[600px] overflow-y-auto">
              <div className="divide-y divide-slate-50">
                {filteredList.map((item, idx) => (
                  <motion.div 
                    key={idx} 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className={`p-6 cursor-pointer transition-all flex items-center justify-between group hover:bg-slate-50/80 ${((activeTab === "students" && selectedStudent?.username === item.username) || (activeTab === "teachers" && selectedTeacher?.username === item.username)) ? "bg-slate-50" : ""}`}
                    onClick={() => activeTab === "students" ? handleViewStudent(item as StudentData) : handleViewTeacher(item as TeacherData)}
                  >
                    <div className="flex items-center gap-5">
                      <div className={`h-14 w-14 rounded-2xl flex items-center justify-center text-xl font-black ${activeTab === "students" ? "bg-indigo-50 text-indigo-500" : "bg-emerald-50 text-emerald-500"}`}>
                        {item.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-black text-slate-900 text-sm uppercase tracking-tight">{item.name}</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                          {activeTab === "students" ? (item as StudentData).rollNumber : (item as TeacherData).username}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {activeTab === "teachers" && (
                        <div className="flex gap-1">
                          {(item as TeacherData).subjects.slice(0, 2).map((s, si) => (
                            <span key={si} className="text-[8px] font-black px-2 py-1 bg-slate-100 text-slate-500 rounded-lg uppercase whitespace-nowrap">{s}</span>
                          ))}
                          {(item as TeacherData).subjects.length > 2 && <span className="text-[8px] font-black px-2 py-1 bg-slate-100 text-slate-400 rounded-lg uppercase">+{(item as TeacherData).subjects.length - 2}</span>}
                        </div>
                      )}
                      <div className="h-10 w-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-300 group-hover:text-slate-900 transition-colors shadow-sm">
                        <Plus className="h-4 w-4" />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Student Details Dialog */}
      <Dialog open={showStudentDialog} onOpenChange={setShowStudentDialog}>
        <DialogContent className="rounded-[2.5rem] border-0 shadow-2xl p-8 max-w-2xl bg-white overflow-y-auto max-h-[90vh]">
          {selectedStudent && (
            <div className="space-y-8">
              <DialogHeader>
                <div className="flex items-start justify-between">
                  <DialogTitle className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center text-xl font-black shadow-inner">
                      {selectedStudent.name.charAt(0)}
                    </div>
                    <div>
                      <p>{selectedStudent.name}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{selectedStudent.rollNumber} • {selectedStudent.department}</p>
                    </div>
                  </DialogTitle>
                  <Button 
                    variant="outline" 
                    onClick={handleDeleteStudent}
                    className="border-rose-200 text-rose-500 hover:bg-rose-50 hover:text-rose-600 rounded-xl"
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> Delete Student
                  </Button>
                </div>
              </DialogHeader>

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Training References</h3>
                  <label className={`cursor-pointer ${isUploadingRef ? "opacity-50 pointer-events-none" : ""}`}>
                    <input 
                      type="file" 
                      className="hidden" 
                      multiple 
                      accept="image/*"
                      onChange={handleAddReference} 
                      disabled={isUploadingRef}
                    />
                    <div className="h-10 px-4 rounded-xl bg-indigo-500 text-white flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 hover:scale-105 transition-all text-[10px] font-black uppercase">
                      {isUploadingRef ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      {isUploadingRef ? "Uploading..." : "Add Reference"}
                    </div>
                  </label>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {studentRefs.length > 0 ? studentRefs.map((ref, ri) => (
                    <div 
                      key={ri} 
                      className="relative group rounded-2xl overflow-hidden aspect-square bg-slate-50 border border-slate-100 shadow-sm cursor-pointer"
                      onClick={() => setPreviewImage(ref.image_url)}
                    >
                      <img src={ref.image_url} alt="Ref" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                      {ri === 0 && (
                        <div className="absolute top-3 left-3 px-2 py-1 bg-indigo-600 text-white text-[8px] font-black uppercase rounded-lg shadow-xl z-10 border border-white/20 backdrop-blur-sm">
                          Baseline
                        </div>
                      )}
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        <label className="cursor-pointer">
                          <input 
                            type="file" 
                            className="hidden" 
                            onChange={(e) => {
                              if (e.target.files?.[0]) {
                                handleUpdateReference(ref.id, e.target.files[0]);
                              }
                            }} 
                          />
                          <div className="h-9 w-9 bg-white/20 backdrop-blur-md text-white rounded-xl flex items-center justify-center hover:bg-indigo-500 transition-all border border-white/10">
                            <RefreshCw className="h-4 w-4" />
                          </div>
                        </label>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-9 w-9 bg-white/20 backdrop-blur-md text-white rounded-xl hover:bg-rose-500 transition-all border border-white/10" 
                          onClick={() => handleDeleteReference(ref.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )) : (
                    <div className="col-span-full py-20 border-2 border-dashed border-slate-100 rounded-[2rem] flex flex-col items-center justify-center text-slate-300">
                      <Eye className="h-8 w-8 mb-2 opacity-20" />
                      <p className="text-[10px] font-black uppercase tracking-widest">No References Uploaded Yet</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Teacher Details Dialog */}
      <Dialog open={showTeacherDialog} onOpenChange={setShowTeacherDialog}>
        <DialogContent className="rounded-[2.5rem] border-0 shadow-2xl p-8 max-w-md bg-white">
          {selectedTeacher && (
            <div className="space-y-8">
              <DialogHeader>
                <div className="flex items-start justify-between">
                  <DialogTitle className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center text-xl font-black shadow-inner">
                      {selectedTeacher.name.charAt(0)}
                    </div>
                    <div>
                      <p>{selectedTeacher.name}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{selectedTeacher.username} • {selectedTeacher.department}</p>
                    </div>
                  </DialogTitle>
                  <Button 
                    variant="outline" 
                    onClick={handleDeleteTeacher}
                    className="border-rose-200 text-rose-500 hover:bg-rose-50 hover:text-rose-600 rounded-xl"
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> Delete Teacher
                  </Button>
                </div>
              </DialogHeader>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Manage Subject Roles</h3>
                  <Button variant="ghost" size="sm" onClick={() => setShowSubjectDialog(true)} className="h-8 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 text-[8px] font-black uppercase">
                    <Plus className="h-3 w-3 mr-1" /> New Subject
                  </Button>
                </div>
                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2 scrollbar-hide">
                  {subjects.map((sub, si) => {
                    const isAssigned = selectedTeacher.subjects.includes(sub.name);
                    return (
                      <div 
                        key={si} 
                        onClick={() => handleAssignSubject(sub.id)}
                        className={`p-4 rounded-2xl transition-all flex items-center justify-between group border ${isAssigned ? "bg-slate-900 text-white border-slate-900 shadow-lg" : "bg-white text-slate-500 border-slate-100"}`}
                      >
                        <div 
                          className="flex items-center gap-3 flex-1 cursor-pointer"
                          onClick={() => handleAssignSubject(sub.id)}
                        >
                          <span className="text-xs font-black uppercase tracking-tight">{sub.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSubject(sub.id, sub.name);
                            }}
                            className={`h-8 w-8 rounded-lg ${isAssigned ? "text-slate-400 hover:text-rose-400 hover:bg-slate-800" : "text-slate-300 hover:text-rose-500 hover:bg-rose-50"}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <div 
                            onClick={() => handleAssignSubject(sub.id)} 
                            className="cursor-pointer flex items-center justify-center h-8 w-8"
                          >
                            {isAssigned ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4 opacity-30 group-hover:opacity-100" />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[9px] font-medium text-slate-400 italic text-center">Click a subject to toggle its assignment to this teacher.</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Subject Creation Dialog */}
      <Dialog open={showSubjectDialog} onOpenChange={setShowSubjectDialog}>
        <DialogContent className="rounded-[2.5rem] border-0 shadow-2xl p-8 max-w-sm bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900 uppercase tracking-tight">Create New Subject</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-6">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Subject Name</label>
              <Input 
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                placeholder="e.g. Software Testing"
                className="h-12 bg-slate-50 border-0 rounded-2xl text-sm font-bold focus-visible:ring-slate-100"
              />
            </div>
            <Button onClick={handleCreateSubject} className="w-full h-14 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-emerald-100 transition-all">
              Add Subject
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Preview Pop-up */}
      <AnimatePresence>
        {previewImage && (
          <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
            <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 overflow-hidden bg-transparent border-0 shadow-none flex items-center justify-center">
            <div className="relative group w-full h-full">
              <div className="absolute inset-0 overflow-y-auto p-4 flex flex-col items-center">
                <motion.img 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  src={previewImage} 
                  alt="Full preview" 
                  className="w-full h-auto max-w-4xl shadow-2xl bg-white p-1" 
                />
              </div>
              <Button 
                onClick={() => setPreviewImage(null)}
                className="absolute top-4 right-4 h-12 w-12 rounded-full bg-black/60 hover:bg-black/80 text-white border-0 backdrop-blur-md z-50"
              >
                <X className="h-6 w-6" />
              </Button>
            </div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminDashboard;

import { useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { signup, login } from "@/lib/api";
import ReferenceUploadModal from "@/components/ReferenceUploadModal";

const CreateAccountPage = () => {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [department, setDepartment] = useState("");
  const [rollNo, setRollNo] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showReferenceModal, setShowReferenceModal] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !username || !department || !rollNo || !password || !role) {
      toast({
        title: "Missing fields",
        description: "Please fill in all fields (Name, Username, Department, Roll No, Password) and select a role.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Send data matching backend's UserCreate schema
      await signup({
        name,
        username,
        roll_number: rollNo,
        password,
        department,
        role,
      });

      // Auto-login after signup using username, password, and role
      await login({ username, password, role });

      toast({
        title: "Account created!",
        description: `Welcome, ${name}!`,
      });

      // Redirect to role-specific dashboard or show reference modal
      if (role === "student") {
        setShowReferenceModal(true);
      } else if (role === "teacher") {
        navigate("/teacher-dashboard");
      } else if (role === "admin") {
        navigate("/admin-dashboard");
      }
    } catch (err: unknown) {
      let errorMessage = "Something went wrong. Please try again.";
      
      if (err instanceof Error) {
        errorMessage = err.message;
        
        // Custom friendly messages for common errors
        if (errorMessage === "Username already registered") {
          errorMessage = "This username is already taken. Please choose a different one.";
        }
      }

      toast({
        title: "Registration failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
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
        <h1 className="text-3xl font-bold tracking-tight text-foreground">LIPIKA</h1>
        <p className="text-sm text-muted-foreground">Create a new account</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-xl shadow-primary/5"
      >
        <form onSubmit={handleCreate} className="flex flex-col gap-5">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium text-foreground">Full Name</Label>
            <Input id="name" placeholder="Enter your full name" value={name} onChange={(e) => setName(e.target.value)} className="h-12 rounded-xl bg-secondary/50 border-0 text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="username" className="text-sm font-medium text-foreground">Username</Label>
            <Input id="username" placeholder="Enter your username" value={username} onChange={(e) => setUsername(e.target.value)} className="h-12 rounded-xl bg-secondary/50 border-0 text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rollno" className="text-sm font-medium text-foreground">Roll No (only for students)</Label>
            <Input id="rollno" placeholder="Enter your Roll No" value={rollNo} onChange={(e) => setRollNo(e.target.value)} className="h-12 rounded-xl bg-secondary/50 border-0 text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium text-foreground">Password</Label>
            <div className="relative">
              <Input id="password" type={showPassword ? "text" : "password"} placeholder="Create a password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 rounded-xl bg-secondary/50 border-0 pr-12 text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="department" className="text-sm font-medium text-foreground">Department</Label>
            <Input id="department" placeholder="Enter your department" value={department} onChange={(e) => setDepartment(e.target.value)} className="h-12 rounded-xl bg-secondary/50 border-0 text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary" />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">Register As</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="h-12 rounded-xl bg-secondary/50 border-0 text-foreground focus:ring-2 focus:ring-primary">
                <SelectValue placeholder="Select your role" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="student">🎓 Student</SelectItem>
                <SelectItem value="teacher">🧑‍🏫 Teacher</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" disabled={loading} className="mt-2 h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-base shadow-md shadow-primary/20 hover:opacity-90 transition-opacity">
            {loading ? "Creating..." : "Create Account"}
          </Button>
        </form>

        <div className="mt-6 border-t border-border pt-4">
          <p className="text-center text-sm text-muted-foreground">Already have an account?</p>
          <Button type="button" variant="outline" className="mt-3 h-12 w-full rounded-xl border-primary/30 text-primary font-semibold hover:bg-primary/5 transition-colors" onClick={() => navigate("/")}>
            Sign In
          </Button>
        </div>
      </motion.div>

      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="mt-8 text-xs text-muted-foreground">
        © 2026 LIPIKA. All rights reserved.
      </motion.p>

      <ReferenceUploadModal
        isOpen={showReferenceModal}
        onClose={() => navigate("/student-dashboard")}
        onComplete={() => navigate("/student-dashboard")}
        studentName={name}
      />
    </div>
  );
};

export default CreateAccountPage;

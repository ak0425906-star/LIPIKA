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
import { login } from "@/lib/api";

const LoginPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password || !role) {
      toast({
        title: "Missing fields",
        description: "Please fill in all fields and select a role.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Use username as email for the API (or append @lipika.local if API expects email format)
      const email = username.includes("@") ? username : `${username.toLowerCase().replace(/\s+/g, "")}@lipika.local`;
      const { user } = await login({ email, password });

      // Verify role matches
      if (user.role !== role) {
        toast({
          title: "Login failed",
          description: "The selected role does not match your account. Please select the correct role.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      toast({
        title: "Login successful",
        description: `Welcome back!`,
      });

      if (role === "teacher") {
        navigate("/teacher-dashboard");
      } else if (role === "admin") {
        navigate("/admin-dashboard");
      } else {
        navigate("/student-dashboard");
      }
    } catch (err: unknown) {
      toast({
        title: "Login failed",
        description: err instanceof Error ? err.message : "User does not found. Please check your credentials.",
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
        <p className="text-sm text-muted-foreground">Sign in to your account</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-xl shadow-primary/5"
      >
        <form onSubmit={handleLogin} className="flex flex-col gap-5">
          <div className="space-y-2">
            <Label htmlFor="username" className="text-sm font-medium text-foreground">Username</Label>
            <Input id="username" placeholder="Enter your username" value={username} onChange={(e) => setUsername(e.target.value)} className="h-12 rounded-xl bg-secondary/50 border-0 text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium text-foreground">Password</Label>
            <div className="relative">
              <Input id="password" type={showPassword ? "text" : "password"} placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 rounded-xl bg-secondary/50 border-0 pr-12 text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">Login As</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="h-12 rounded-xl bg-secondary/50 border-0 text-foreground focus:ring-2 focus:ring-primary">
                <SelectValue placeholder="Select your role" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="teacher">🧑‍🏫 Teacher</SelectItem>
                <SelectItem value="admin">🛡️ Admin</SelectItem>
                <SelectItem value="student">🎓 Student</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" disabled={loading} className="mt-2 h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-base shadow-md shadow-primary/20 hover:opacity-90 transition-opacity">
            {loading ? "Signing In..." : "Sign In"}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Forgot your password?{" "}
          <span className="font-medium text-primary cursor-pointer hover:underline">Contact Admin</span>
        </p>

        <div className="mt-4 border-t border-border pt-4">
          <p className="text-center text-sm text-muted-foreground">Don't have an account?</p>
          <Button type="button" variant="outline" className="mt-3 h-12 w-full rounded-xl border-primary/30 text-primary font-semibold hover:bg-primary/5 transition-colors" onClick={() => navigate("/create-account")}>
            Create Account
          </Button>
        </div>
      </motion.div>

      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="mt-8 text-xs text-muted-foreground">
        © 2026 LIPIKA. All rights reserved.
      </motion.p>
    </div>
  );
};

export default LoginPage;

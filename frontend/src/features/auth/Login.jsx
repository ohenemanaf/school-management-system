import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { IconSchool, IconLock, IconMail, IconEye, IconEyeOff } from '@tabler/icons-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

import bgImage from '../../assets/school_background.png';
import illustration from '../../assets/login_illustration.png';

const Login = () => {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(0);

    const slides = [
        {
            title: "Comprehensive School Management",
            desc: "Streamline administration, empower lecturers, and track student success with our all-in-one academic management platform."
        },
        {
            title: "Data-Driven Analytics",
            desc: "Gain deep insights into institutional performance, attendance trends, and financial health through interactive dashboards."
        },
        {
            title: "Seamless Communication",
            desc: "Keep students, parents, and lecturers connected with integrated messaging, announcements, and portal updates."
        }
    ];

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % slides.length);
        }, 3000);
        return () => clearInterval(timer);
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const loggedInUser = await login(email, password);
            toast.success('Welcome back!');
            if (loggedInUser?.role === 'GATEKEEPER') {
                navigate('/gatekeeper');
            } else {
                navigate('/admin');
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Login failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div 
            className="min-h-screen bg-cover bg-center flex items-center justify-center p-4 relative"
            style={{ backgroundImage: `url(${bgImage})` }}
        >
            {/* Dark overlay for better contrast against background */}
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md z-0"></div>

            {/* Main Container */}
            <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl flex flex-col md:flex-row overflow-hidden z-10 min-h-[600px]">
                
                {/* Left Side: Form */}
                <div className="w-full md:w-1/2 p-10 md:p-14 flex flex-col justify-center relative bg-white">
                    {/* Logo Area */}
                    <div className="flex items-center gap-2 mb-10">
                        <div className="w-8 h-8 rounded-full border border-slate-300 flex items-center justify-center">
                            <IconSchool className="text-slate-800" size={16} />
                        </div>
                        <span className="font-bold text-slate-800 tracking-tight text-sm text-primary-600">SMS</span>
                    </div>

                    <h1 className="text-3xl font-semibold text-slate-800 mb-8 tracking-tight">Let's get you signed in</h1>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Email */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email Address</label>
                            <input
                                type="email"
                                required
                                className="block w-full px-4 py-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none text-sm text-slate-800 placeholder-slate-400"
                                placeholder="Enter your email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="block text-xs font-semibold text-slate-700">Password</label>
                                <a href="#" className="text-xs font-medium text-slate-500 hover:text-primary-600 transition-colors">Forgot Password?</a>
                            </div>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    className="block w-full pl-4 pr-16 py-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none text-sm text-slate-800 placeholder-slate-400"
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <button 
                                    type="button" 
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-xs font-medium text-slate-500 hover:text-slate-700 cursor-pointer"
                                >
                                    {showPassword ? "Hide" : "Show"}
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                            <input type="checkbox" id="keepLoggedIn" className="w-4 h-4 rounded text-[#1a365d] focus:ring-[#1a365d] border-slate-300 cursor-pointer" defaultChecked />
                            <label htmlFor="keepLoggedIn" className="text-xs text-slate-600 cursor-pointer font-medium">Keep me logged in</label>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full flex items-center justify-center py-3 rounded-lg text-sm font-semibold text-white bg-[#0f172a] hover:bg-[#1e293b] transition-colors disabled:opacity-60 mt-4 cursor-pointer"
                        >
                            {isSubmitting ? 'Signing in...' : 'Sign in'}
                        </button>
                    </form>
                </div>

                {/* Right Side: Illustration */}
                <div className="hidden md:flex w-1/2 bg-white border-l border-slate-100 flex-col items-center justify-center p-12 text-center">
                    <img src={illustration} alt="School Management" className="w-full max-w-sm mb-8 mix-blend-multiply" />
                    
                    <div className="h-28 flex flex-col justify-start">
                        <h2 className="text-xl font-bold text-slate-800 mb-3 transition-all duration-300">{slides[currentSlide].title}</h2>
                        <p className="text-sm text-slate-500 leading-relaxed max-w-md mx-auto transition-all duration-300">
                            {slides[currentSlide].desc}
                        </p>
                    </div>
                    
                    <button className="mt-8 bg-[#1e3a8a] text-white px-8 py-2.5 rounded-lg text-sm font-semibold shadow-md hover:bg-[#1e40af] transition-colors cursor-pointer">
                        Learn More
                    </button>
                    
                    <div className="flex gap-2 mt-8">
                        {slides.map((_, i) => (
                            <div 
                                key={i} 
                                className={`w-2.5 h-2.5 rounded-full transition-colors duration-500 ${currentSlide === i ? 'bg-[#1e3a8a] w-6' : 'bg-slate-200'}`}
                            ></div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;

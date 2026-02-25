import { Link, useLocation } from "wouter";
import { Camera, Image as ImageIcon, Bluetooth } from "lucide-react";
import { motion } from "framer-motion";

export function NavigationBar() {
  const [location] = useLocation();

  const navItems = [
    { path: "/", icon: Camera, label: "Capture" },
    { path: "/gallery", icon: ImageIcon, label: "Gallery" },
    { path: "/accessory", icon: Bluetooth, label: "Accessory" },
  ];

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <nav className="glass-panel px-4 py-3 rounded-full flex items-center gap-2 md:gap-4 shadow-xl shadow-black/5">
        {navItems.map((item) => {
          const isActive = location === item.path;
          const Icon = item.icon;
          
          return (
            <Link key={item.path} href={item.path} className="relative px-4 py-2 rounded-full flex items-center gap-2 text-sm font-medium transition-colors hover:text-foreground">
              <span className={`relative z-10 flex items-center gap-2 ${isActive ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                <span className="hidden md:inline-block">{item.label}</span>
              </span>
              
              {isActive && (
                <motion.div
                  layoutId="nav-pill"
                  className="absolute inset-0 bg-primary rounded-full z-0"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

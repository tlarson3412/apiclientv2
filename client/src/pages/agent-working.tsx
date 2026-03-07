import { Loader2 } from "lucide-react";
import { Typography } from "@/components/ui/typography";
import replitLogo from "@/assets/replit-logo.png";
import usbankIcon from "@/assets/usbank-icon.png";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 bg-accent" data-testid="page-agent-working">
      <div className="flex items-center gap-4" data-testid="logos-container">
        <img 
          src={replitLogo} 
          alt="Replit" 
          className="h-12 w-12" 
          data-testid="img-replit-logo"
        />
        <Typography variant="heading-large" data-testid="text-x">
          x
        </Typography>
        <img 
          src={usbankIcon} 
          alt="US Bank" 
          className="h-12 w-12" 
          data-testid="img-usbank-logo"
        />
      </div>
      <Loader2 
        className="h-12 w-12 text-blue-500 animate-spin" 
        data-testid="spinner-loading"
      />
      <Typography variant="heading-medium" data-testid="text-agent-status">Replit Agent is Working</Typography>
    </div>
  );
}

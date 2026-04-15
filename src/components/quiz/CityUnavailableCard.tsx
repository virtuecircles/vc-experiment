import { GlowCard } from "@/components/GlowCard";
import { Button } from "@/components/ui/button";
import { MapPin, Heart, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface CityUnavailableCardProps {
  cityName: string;
  stateName: string;
}

export const CityUnavailableCard = ({ cityName, stateName }: CityUnavailableCardProps) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen py-12 px-4 flex items-center justify-center">
      <div className="max-w-lg w-full">
        <GlowCard className="p-8 text-center">
          <div className="mb-6">
            <div className="relative inline-block">
              <div className="p-4 bg-primary/10 rounded-full">
                <MapPin className="h-12 w-12 text-primary" />
              </div>
              <div className="absolute -bottom-1 -right-1 p-2 bg-secondary/20 rounded-full">
                <Heart className="h-5 w-5 text-secondary" />
              </div>
            </div>
          </div>

          <h1 className="text-2xl font-display font-bold mb-4">
            Great friendships take time and place.
          </h1>
          
          <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
            We're expanding thoughtfully — and we'll contact you as soon as Virtue Circles reaches{" "}
            <span className="text-foreground font-medium">{cityName}, {stateName}</span>.
          </p>

          <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 mb-6">
            <div className="flex items-center justify-center gap-2 text-sm text-primary">
              <Bell className="h-4 w-4" />
              <span>You're on our waitlist!</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              We've saved your information and will notify you when we launch in your city.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Button 
              variant="outline" 
              onClick={() => navigate("/")}
              className="w-full"
            >
              Return to Home
            </Button>
            <p className="text-xs text-muted-foreground">
              Have questions?{" "}
              <a href="mailto:support@virtuecircles.com" className="text-primary hover:underline">
                Contact us
              </a>
            </p>
          </div>
        </GlowCard>
      </div>
    </div>
  );
};

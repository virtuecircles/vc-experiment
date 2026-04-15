import { GlowCard } from "@/components/GlowCard";
import { AlertTriangle } from "lucide-react";

const Waiver = () => {
  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-center mb-6">
          <AlertTriangle className="h-12 w-12 text-accent" />
        </div>
        <h1 className="text-5xl font-display font-bold mb-8 text-center">
          <span className="gradient-text">Waiver of Responsibility</span>
        </h1>
        
        <GlowCard className="p-8 space-y-6">
          <div className="bg-accent/10 border border-accent/30 p-4 rounded-lg">
            <p className="text-sm font-bold">IMPORTANT LEGAL NOTICE</p>
            <p className="text-sm text-muted-foreground mt-2">
              Please read this waiver carefully before participating in any Virtue Circles events.
            </p>
          </div>

          <section>
            <h2 className="text-2xl font-display font-bold mb-4">Assumption of Risk</h2>
            <p className="text-muted-foreground">
              By participating in Virtue Circles events, you acknowledge that:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mt-3">
              <li>Meeting new people involves inherent social and personal risks</li>
              <li>Virtue Circles cannot guarantee the behavior or character of any participant</li>
              <li>You are responsible for your own safety and well-being</li>
              <li>Events may involve physical activities with associated risks</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-display font-bold mb-4">Release of Liability</h2>
            <p className="text-muted-foreground">
              You release Virtue Circles, its founders, employees, and moderators from all liability for:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mt-3">
              <li>Injuries, losses, or damages during events</li>
              <li>Actions or behavior of other participants</li>
              <li>Accuracy of matching or compatibility assessments</li>
              <li>Outcomes of friendships formed through the platform</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-display font-bold mb-4">Safety Guidelines</h2>
            <p className="text-muted-foreground mb-3">
              While you assume responsibility for your safety, we strongly recommend:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Meeting in public places for initial events</li>
              <li>Informing a friend or family member of your plans</li>
              <li>Trusting your instincts and leaving if uncomfortable</li>
              <li>Reporting any concerning behavior to moderators</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-display font-bold mb-4">Medical Conditions</h2>
            <p className="text-muted-foreground">
              You certify that you are in good health and have no medical conditions that would 
              prevent safe participation in events. You agree to inform moderators of any relevant 
              accommodations needed.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display font-bold mb-4">Agreement</h2>
            <p className="text-muted-foreground">
              By using Virtue Circles, you acknowledge that you have read, understood, and agree 
              to this waiver. This agreement is binding and applies to all events and activities.
            </p>
          </section>

          <div className="pt-6 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </div>
        </GlowCard>
      </div>
    </div>
  );
};

export default Waiver;

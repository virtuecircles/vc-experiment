import { GlowCard } from "@/components/GlowCard";

const Privacy = () => {
  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-5xl font-display font-bold mb-8">
          <span className="gradient-text">Privacy Policy</span>
        </h1>
        
        <GlowCard className="p-8 space-y-6">
          <section>
            <h2 className="text-2xl font-display font-bold mb-4">Information We Collect</h2>
            <p className="text-muted-foreground">
              We collect information you provide directly, including your quiz responses, demographic data, 
              and communication preferences. This helps us create accurate virtue profiles and meaningful matches.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display font-bold mb-4">How We Use Your Information</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Create your virtue profile and match you with compatible people</li>
              <li>Organize and coordinate events</li>
              <li>Improve our matching algorithms</li>
              <li>Communicate with you about your account and events</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-display font-bold mb-4">Data Security</h2>
            <p className="text-muted-foreground">
              We implement industry-standard security measures to protect your personal information. 
              Your data is encrypted and stored securely.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display font-bold mb-4">Your Rights</h2>
            <p className="text-muted-foreground">
              You have the right to access, update, or delete your personal information at any time 
              through your dashboard or by contacting us.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display font-bold mb-4">Contact Us</h2>
            <p className="text-muted-foreground">
              Questions about our privacy practices? Email us at{" "}
              <a href="mailto:hello@virtue-circles.com" className="text-primary hover:underline">
                hello@virtue-circles.com
              </a>
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

export default Privacy;

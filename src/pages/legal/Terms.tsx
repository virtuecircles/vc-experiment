import { GlowCard } from "@/components/GlowCard";

const Terms = () => {
  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-5xl font-display font-bold mb-8">
          <span className="gradient-text">Terms of Use</span>
        </h1>
        
        <GlowCard className="p-8 space-y-6">
          <section>
            <h2 className="text-2xl font-display font-bold mb-4">Acceptance of Terms</h2>
            <p className="text-muted-foreground">
              By using Virtue Circles, you agree to these terms. If you don't agree, please don't use our service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display font-bold mb-4">Membership & Payments</h2>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Memberships are billed monthly or annually as selected</li>
              <li>You can cancel anytime; cancellation takes effect at the end of your billing period</li>
              <li>Founding Members receive 1st Month FREE + 50% Off the next 2 months; this offer is non-transferable</li>
              <li>Venue partner discounts on food & beverages are subject to partner availability and may change without notice</li>
              <li>Referral discount of 10% off your next billing cycle applies once per referral and cannot be combined with other offers</li>
              <li>Circle switching is permitted once per calendar month</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-display font-bold mb-4">Refund Policy</h2>
            <p className="text-muted-foreground">
              No refunds. Monthly and annual subscriptions may be canceled at any time before the next billing date. 
              Upon cancellation, your access remains active until the end of the current billing period. 
              No partial refunds or credits will be issued for unused time within a billing cycle.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display font-bold mb-4">Code of Conduct</h2>
            <p className="text-muted-foreground mb-4">
              All members are expected to uphold the values of Virtue Circles. By participating, you agree to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Treat all members, guides, and staff with dignity and respect</li>
              <li>Communicate honestly and in good faith</li>
              <li>Refrain from harassment, discrimination, or abusive behavior of any kind</li>
              <li>Respect the privacy and personal boundaries of other members</li>
              <li>Not solicit, promote, or engage in commercial activity during events</li>
              <li>Report any concerns or violations to a guide or moderator promptly</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              Violations of this Code of Conduct may result in warnings, suspension, or permanent removal from Virtue Circles 
              at the sole discretion of the moderation team, without refund.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-display font-bold mb-4">User Conduct</h2>
            <p className="text-muted-foreground mb-4">
              You agree to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Provide accurate information</li>
              <li>Treat all members with respect</li>
              <li>Follow our Code of Conduct as outlined above</li>
              <li>Not misuse the platform for commercial purposes</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-display font-bold mb-4">Limitation of Liability</h2>
          <p className="text-muted-foreground">
              Virtue Circles provides a platform for members to meet. We are not responsible for 
              the behavior of members or outcomes of meetups. See our Waiver for more details.
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

export default Terms;

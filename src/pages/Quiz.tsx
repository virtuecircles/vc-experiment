import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { GlowCard } from "@/components/GlowCard";
import { Progress } from "@/components/ui/progress";
import { likertQuestions, openEndedQuestions, preferenceQuestions } from "@/data/quizQuestions";
import { DemographicData } from "@/types/quiz";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useQuizProgress } from "@/hooks/useQuizProgress";
import { supabase } from "@/integrations/supabase/client";
import { CityUnavailableCard } from "@/components/quiz/CityUnavailableCard";
import { AddressAutocomplete } from "@/components/quiz/AddressAutocomplete";
import { calculateVirtueScores } from "@/lib/virtueScoring";
import { trackQuizStart, trackQuizComplete, metaTrackQuizStart, metaTrackQuizComplete } from "@/lib/analytics";

// Safely converts a raw dateOfBirth string (MM/DD/YYYY or already ISO) to YYYY-MM-DD.
// Returns null for any value that is missing, invalid, or doesn't parse as a real date.
const formatDobForDb = (raw: string | null | undefined): string | null => {
  if (!raw) return null;
  let mm: number, dd: number, yyyy: number;

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    // Already YYYY-MM-DD
    const parts = raw.split('-');
    yyyy = parseInt(parts[0], 10);
    mm = parseInt(parts[1], 10);
    dd = parseInt(parts[2], 10);
  } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
    // MM/DD/YYYY
    const parts = raw.split('/');
    mm = parseInt(parts[0], 10);
    dd = parseInt(parts[1], 10);
    yyyy = parseInt(parts[2], 10);
  } else if (raw.length === 8 && !raw.includes('-') && !raw.includes('/')) {
    // 8 digits: detect YYYYMMDD vs MMDDYYYY
    const yr = parseInt(raw.slice(0, 4), 10);
    if (yr >= 1900 && yr <= 2100) {
      yyyy = yr;
      mm = parseInt(raw.slice(4, 6), 10);
      dd = parseInt(raw.slice(6, 8), 10);
    } else {
      mm = parseInt(raw.slice(0, 2), 10);
      dd = parseInt(raw.slice(2, 4), 10);
      yyyy = parseInt(raw.slice(4, 8), 10);
    }
  } else {
    return null; // unrecognized format
  }

  // Validate ranges
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31 || yyyy < 1900 || yyyy > new Date().getFullYear()) {
    return null;
  }

  // Construct and verify the date is real (e.g., reject Feb 30)
  const iso = `${String(yyyy).padStart(4, '0')}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
  const d = new Date(yyyy, mm - 1, dd);
  if (d.getFullYear() !== yyyy || d.getMonth() !== mm - 1 || d.getDate() !== dd) {
    return null; // Invalid date like Feb 30
  }

  return iso;
};


interface City {
  id: string;
  name: string;
  state: string;
  is_active: boolean;
}

const Quiz = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isRetake = searchParams.get("retake") === "true";
  const { user, loading: authLoading } = useAuth();
  const { loading: progressLoading, progress, saveProgress } = useQuizProgress();
  const [step, setStep] = useState(1);
  const [hasInitialized, setHasInitialized] = useState(false);
  const totalSteps = 4;

  // Cities
  const [cities, setCities] = useState<City[]>([]);
  const [loadingCities, setLoadingCities] = useState(true);
  const [showCityUnavailable, setShowCityUnavailable] = useState(false);
  const [selectedCityInfo, setSelectedCityInfo] = useState<{ name: string; state: string } | null>(null);

  // Demographics
  const [demographics, setDemographics] = useState<DemographicData>({
    firstName: "",
    lastName: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    email: "",
    dateOfBirth: "",
    sex: "",
    orientation: "", // Optional field
    occupation: "",
    annualIncome: "",
    cityId: "",
  });

  // Likert scale responses (1-5)
  const [likertResponses, setLikertResponses] = useState<Record<number, number>>({});

  // Open-ended responses
  const [openEndedResponses, setOpenEndedResponses] = useState<Record<string, string | string[]>>({});

  const progress_percent = (step / totalSteps) * 100;

  const likertOptions = [
    { value: 5, label: "Highly Agree" },
    { value: 4, label: "Somewhat Agree" },
    { value: 3, label: "Neutral" },
    { value: 2, label: "Somewhat Disagree" },
    { value: 1, label: "Highly Disagree" },
  ];

  // Redirect to auth if not logged in, or dashboard if quiz completed
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  // Fetch cities
  useEffect(() => {
    const fetchCities = async () => {
      try {
        const { data, error } = await supabase
          .from("cities")
          .select("id, name, state, is_active")
          .order("state", { ascending: true })
          .order("name", { ascending: true });

        if (error) throw error;
        setCities(data || []);
      } catch (error) {
        console.error("Error fetching cities:", error);
      } finally {
        setLoadingCities(false);
      }
    };

    fetchCities();
  }, []);

  // Redirect to dashboard if quiz already completed (unless retaking)
  useEffect(() => {
    if (!progressLoading && progress?.completedAt && !isRetake) {
      navigate("/dashboard");
    }
  }, [progressLoading, progress, navigate, isRetake]);

  // Enforce intro gate: redirect to /quiz-intro if user hasn't agreed
  useEffect(() => {
    if (!progressLoading && !authLoading && user && !isRetake) {
      const agreed = sessionStorage.getItem("quizIntroAgreed");
      const alreadyStarted = progress && progress.currentStep > 1;
      if (!agreed && !alreadyStarted && !progress?.completedAt) {
        navigate("/quiz-intro");
      }
    }
  }, [progressLoading, authLoading, user, progress, navigate, isRetake]);

  // Initialize state from saved progress
  useEffect(() => {
    if (!progressLoading && progress && !hasInitialized && (!progress.completedAt || isRetake)) {
      setStep(progress.currentStep);
      setDemographics(progress.demographics);
      setLikertResponses(progress.likertResponses);
      setOpenEndedResponses(progress.openEndedResponses);
      setHasInitialized(true);
      trackQuizStart();
      metaTrackQuizStart();
    }
  }, [progressLoading, progress, hasInitialized]);

  // Initialize default values for preference questions
  useEffect(() => {
    if (hasInitialized) {
      const defaults: Record<string, string | string[]> = {};
      preferenceQuestions.forEach((q) => {
        if (q.defaultValue && !openEndedResponses[q.id]) {
          defaults[q.id] = q.defaultValue;
        }
      });
      if (Object.keys(defaults).length > 0) {
        setOpenEndedResponses((prev) => ({ ...defaults, ...prev }));
      }
    }
  }, [hasInitialized]);

  // Auto-save progress when state changes
  useEffect(() => {
    if (hasInitialized && user) {
      const timeoutId = setTimeout(() => {
        saveProgress(step, demographics, likertResponses, openEndedResponses);
      }, 500); // Debounce saves
      return () => clearTimeout(timeoutId);
    }
  }, [step, demographics, likertResponses, openEndedResponses, hasInitialized, user, saveProgress]);

  const handleNext = () => {
    if (step === 1) {
      // Validate demographics - orientation is optional, cityId is required
      const requiredFields: (keyof DemographicData)[] = [
        "firstName", "lastName", "phone", "address", "city", "state", "zipCode", "email", 
        "dateOfBirth", "sex", "occupation", "annualIncome", "cityId"
      ];
      const missingFields = requiredFields.filter((field) => !demographics[field]);
      if (missingFields.length > 0) {
        toast.error("Please fill in all required fields including your address and city");
        return;
      }

      // Validate DOB is a real, parseable date
      if (!formatDobForDb(demographics.dateOfBirth)) {
        toast.error("Please enter a valid date of birth (MM/DD/YYYY)");
        return;
      }

      // Check if selected city is active
      const selectedCity = cities.find(c => c.id === demographics.cityId);
      if (selectedCity && !selectedCity.is_active) {
        setSelectedCityInfo({ name: selectedCity.name, state: selectedCity.state });
        setShowCityUnavailable(true);
        // Save user's info even if city is not active (for waitlist)
        if (user) {
          supabase
            .from("profiles")
            .update({
            first_name: demographics.firstName,
              last_name: demographics.lastName,
              phone: demographics.phone,
              address: demographics.address,
              city: demographics.city,
              state: demographics.state,
              zip_code: demographics.zipCode,
              city_id: demographics.cityId,
              email: demographics.email,
              occupation: demographics.occupation || null,
              annual_income: demographics.annualIncome || null,
              gender_identity: demographics.sex || null,
              orientation: demographics.orientation || null,
              date_of_birth: formatDobForDb(demographics.dateOfBirth),
            })
            .eq("id", user.id)
            .then(({ error }) => {
              if (error) console.error("Error saving profile for waitlist:", error);
            });
        }
        return;
      }
    }

    // Sync demographics to profile after Step 1 completes (active city)
    if (step === 1 && user) {
      supabase
        .from("profiles")
        .update({
          first_name: demographics.firstName,
          last_name: demographics.lastName,
          phone: demographics.phone,
          address: demographics.address,
          city: demographics.city,
          state: demographics.state,
          zip_code: demographics.zipCode,
          city_id: demographics.cityId,
          email: demographics.email,
          occupation: demographics.occupation || null,
          annual_income: demographics.annualIncome || null,
          gender_identity: demographics.sex || null,
          orientation: demographics.orientation || null,
          date_of_birth: formatDobForDb(demographics.dateOfBirth),
        })
        .eq("id", user.id)
        .then(({ error }) => {
          if (error) console.error("Error syncing demographics to profile:", error);
        });
    }

    if (step === 2) {
      // Validate likert responses
      if (Object.keys(likertResponses).length < likertQuestions.length) {
        toast.error("Please answer all questions");
        return;
      }
    }

    if (step === 3) {
      // Validate open-ended responses
      const requiredOpenEnded = openEndedQuestions.filter(q => q.required);
      const missingResponses = requiredOpenEnded.filter(q => {
        const response = openEndedResponses[q.id];
        if (Array.isArray(response)) {
          return response.length === 0;
        }
        return !response;
      });
      
      if (missingResponses.length > 0) {
        toast.error("Please answer all required questions");
        return;
      }
    }

    if (step < totalSteps) {
      setStep(step + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSubmit = async () => {
    // Validate preference responses
    const requiredPreferences = preferenceQuestions.filter(q => q.required);
    const missingResponses = requiredPreferences.filter(q => {
      const response = openEndedResponses[q.id];
      if (Array.isArray(response)) {
        return response.length === 0;
      }
      return !response;
    });
    
    if (missingResponses.length > 0) {
      toast.error("Please answer all required questions");
      return;
    }

    // Calculate virtue scores using normalized scoring logic
    const scoreResults = calculateVirtueScores(likertResponses);
    
    // Detect balanced result: all 6 normalized scores within 5 points of each other
    const isBalanced = scoreResults.isBalanced;

    // For balanced profiles, store 'Balanced' instead of the alphabetically-first virtue
    const primaryVirtue = isBalanced ? 'Balanced' : scoreResults.primary.virtue;
    const secondaryVirtue = isBalanced ? 'Balanced' : scoreResults.secondary.virtue;

    // Save results to localStorage and database
    const results = {
      demographics,
      likertResponses,
      openEndedResponses,
      primaryVirtue,
      secondaryVirtue,
      virtueScores: scoreResults.normalizedScores, // normalized 0-100 for backward compat
      normalizedScores: scoreResults.normalizedScores,
      allVirtues: scoreResults.allVirtues,
      rawScores: scoreResults.rawScores,
      tiedVirtues: scoreResults.tiedVirtues,
      isBalanced,
    };
    localStorage.setItem("quizResults", JSON.stringify(results));
    
    // Mark as completed in database and update profile with virtue results
    if (user) {
      // Save quiz progress with completion timestamp
      await saveProgress(step, demographics, likertResponses, openEndedResponses, new Date().toISOString());

      // Get current attempt count to increment it
      const { data: currentProfile } = await supabase
        .from("profiles")
        .select("quiz_attempt_count")
        .eq("id", user.id)
        .single();

      const newAttemptCount = ((currentProfile?.quiz_attempt_count as number) || 0) + 1;

      // Flag ALL balanced results; auto-clear flag on normal result
      const shouldFlag = isBalanced;
      
      // Map quiz open-ended responses to profile fields
      const availabilityRaw = openEndedResponses["availability"];
      const availabilityArr = Array.isArray(availabilityRaw) ? availabilityRaw : availabilityRaw ? [availabilityRaw] : [];
      const availabilityJson = availabilityArr.length > 0 ? { meetup_times: availabilityArr } : undefined;

      // Communication is multiselect — store as array in availability json blob
      // and map to closest enum for communication_preference
      const commRaw = openEndedResponses["communication"];
      const commArr: string[] = Array.isArray(commRaw) ? commRaw : commRaw ? [commRaw as string] : [];
      const hasEmail = commArr.some(c => c.toLowerCase().includes("email"));
      const hasSms = commArr.some(c => c.toLowerCase().includes("text") || c.toLowerCase().includes("sms"));
      let commPref: "email" | "sms" | "both" = "email";
      if (hasEmail && hasSms) commPref = "both";
      else if (hasSms) commPref = "sms";
      else commPref = "email";

      // Update profiles table with virtue results, demographics, and attempt tracking
      const { error } = await supabase
        .from("profiles")
        .update({
          primary_virtue: primaryVirtue,
          secondary_virtue: secondaryVirtue,
          virtue_scores: {
            normalized_scores: scoreResults.normalizedScores,
            raw_scores: scoreResults.rawScores,
            all_virtues_ranked: scoreResults.allVirtues.map(v => ({ ...v })),
            is_balanced: isBalanced,
          } as unknown as import("@/integrations/supabase/types").Json,
          quiz_attempt_count: newAttemptCount,
          flagged_for_review: shouldFlag,
          flag_reason: shouldFlag
            ? (newAttemptCount === 1
                ? "Balanced result on first attempt — pending admin review"
                : `Balanced result on attempt ${newAttemptCount} — user retook quiz and is still balanced`)
            : null,
          first_name: demographics.firstName,
          last_name: demographics.lastName,
          phone: demographics.phone,
          address: demographics.address,
          city: demographics.city,
          state: demographics.state,
          zip_code: demographics.zipCode,
          date_of_birth: formatDobForDb(demographics.dateOfBirth),
          occupation: demographics.occupation || null,
          annual_income: demographics.annualIncome || null,
          gender_identity: demographics.sex || null,
          orientation: demographics.orientation || null,
          city_id: demographics.cityId,
          communication_preference: commPref,
          ...(availabilityJson ? { availability: availabilityJson as unknown as import("@/integrations/supabase/types").Json } : {}),
        })
        .eq("id", user.id);
      
      if (error) {
        console.error("Error updating profile with virtue results:", error);
      }

      // Auto-disable retest permission after quiz is completed so the tab disappears
      await supabase
        .from("retest_permissions")
        .update({ enabled: false })
        .eq("user_id", user.id)
        .eq("enabled", true);

      // Send welcome email on first quiz completion
      if (newAttemptCount === 1) {
        try {
          await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-auto-emails`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
              },
              body: JSON.stringify({ email_type: "welcome_emails", user_id: user.id }),
            }
          );
        } catch (emailErr) {
          // Non-fatal: email failure should not block quiz completion
          console.error("Failed to trigger welcome email:", emailErr);
        }
      }
    }

    toast.success("Quiz completed! Analyzing your results...");
    trackQuizComplete(primaryVirtue, isRetake);
    metaTrackQuizComplete();
    setTimeout(() => {
      navigate("/quiz-results");
    }, 1500);
  };

  const handleCheckboxChange = (questionId: string, value: string, checked: boolean) => {
    const current = (openEndedResponses[questionId] as string[]) || [];
    if (checked) {
      setOpenEndedResponses({
        ...openEndedResponses,
        [questionId]: [...current, value],
      });
    } else {
      setOpenEndedResponses({
        ...openEndedResponses,
        [questionId]: current.filter((v) => v !== value),
      });
    }
  };

  const renderQuestion = (question: typeof openEndedQuestions[0]) => (
    <div key={question.id}>
      <Label className="text-base mb-3 block">
        {question.question}
        {question.required && <span className="text-destructive ml-1">*</span>}
      </Label>
      
      {question.type === "text" && (
        <Textarea
          value={(openEndedResponses[question.id] as string) || ""}
          onChange={(e) =>
            setOpenEndedResponses({ ...openEndedResponses, [question.id]: e.target.value })
          }
          rows={3}
          className="mt-2"
        />
      )}

      {question.type === "select" && question.options && (
        <Select
          value={(openEndedResponses[question.id] as string) || ""}
          onValueChange={(value) =>
            setOpenEndedResponses({ ...openEndedResponses, [question.id]: value })
          }
        >
          <SelectTrigger className="mt-2">
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            {question.options.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {question.type === "multiselect" && question.options && (
        <div className="space-y-2 mt-2">
          {question.options.map((option) => (
            <div key={option} className="flex items-center space-x-2">
              <Checkbox
                id={`${question.id}-${option}`}
                checked={((openEndedResponses[question.id] as string[]) || []).includes(option)}
                onCheckedChange={(checked) =>
                  handleCheckboxChange(question.id, option, checked as boolean)
                }
              />
              <Label htmlFor={`${question.id}-${option}`}>{option}</Label>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  if (authLoading || progressLoading || loadingCities) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading your progress...</div>
      </div>
    );
  }

  // Show city unavailable card if user's city is not active
  if (showCityUnavailable && selectedCityInfo) {
    return <CityUnavailableCard cityName={selectedCityInfo.name} stateName={selectedCityInfo.state} />;
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-display font-bold mb-4">
            Discover Your <span className="gradient-text">Virtue Profile</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-6">
            This quiz will help us understand your character strengths and match you with like-minded people
          </p>
          <Progress value={progress_percent} className="h-3" />
          <p className="text-sm text-muted-foreground mt-2">
            Step {step} of {totalSteps}
          </p>
        </div>

        {/* Step 1: Demographics */}
        {step === 1 && (
          <GlowCard className="p-8">
            <h2 className="text-2xl font-display font-bold mb-6">Basic Information</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={demographics.firstName}
                  onChange={(e) => setDemographics({ ...demographics, firstName: e.target.value })}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={demographics.lastName}
                  onChange={(e) => setDemographics({ ...demographics, lastName: e.target.value })}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={demographics.email}
                  onChange={(e) => setDemographics({ ...demographics, email: e.target.value })}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  value={demographics.phone}
                  onChange={(e) => setDemographics({ ...demographics, phone: e.target.value })}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="cityId">City *</Label>
                <Select 
                  value={demographics.cityId || undefined} 
                  onValueChange={(value) => setDemographics({ ...demographics, cityId: value })}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select your city..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {cities.map((city) => (
                      <SelectItem key={city.id} value={city.id}>
                        {city.name}, {city.state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Select the city where you'll participate in Virtue Circles
                </p>
              </div>
              <div className="md:col-span-2">
                <AddressAutocomplete
                  value={{
                    address: demographics.address,
                    city: demographics.city,
                    state: demographics.state,
                    zipCode: demographics.zipCode,
                  }}
                  onChange={(addressData) => setDemographics({
                    ...demographics,
                    address: addressData.address,
                    city: addressData.city,
                    state: addressData.state,
                    zipCode: addressData.zipCode,
                  })}
                />
              </div>
              <div>
                <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                <Input
                  id="dateOfBirth"
                  placeholder="MM/DD/YYYY"
                  value={demographics.dateOfBirth}
                  onChange={(e) => {
                    let value = e.target.value.replace(/[^\d/]/g, '');
                    // Auto-format: add slashes after MM and DD
                    if (value.length === 2 && !value.includes('/')) {
                      value = value + '/';
                    } else if (value.length === 5 && value.split('/').length === 2) {
                      value = value + '/';
                    }
                    // Limit to 10 characters (MM/DD/YYYY)
                    if (value.length <= 10) {
                      setDemographics({ ...demographics, dateOfBirth: value });
                    }
                  }}
                  className={`mt-2 ${demographics.dateOfBirth && !formatDobForDb(demographics.dateOfBirth) ? 'border-destructive' : ''}`}
                  maxLength={10}
                />
                {demographics.dateOfBirth && !formatDobForDb(demographics.dateOfBirth) && (
                  <p className="text-xs text-destructive mt-1">Please enter a valid date (MM/DD/YYYY)</p>
                )}
              </div>
              <div>
                <Label htmlFor="sex">Sex I Identify With *</Label>
                <Select value={demographics.sex || undefined} onValueChange={(value) => setDemographics({ ...demographics, sex: value })}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="non-binary">Non-Binary</SelectItem>
                    <SelectItem value="prefer-not-to-say">Prefer Not to Say</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="orientation">Orientation</Label>
                <Select value={demographics.orientation || undefined} onValueChange={(value) => setDemographics({ ...demographics, orientation: value })}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="straight">Straight</SelectItem>
                    <SelectItem value="gay">Gay</SelectItem>
                    <SelectItem value="lesbian">Lesbian</SelectItem>
                    <SelectItem value="bisexual">Bisexual</SelectItem>
                    <SelectItem value="pansexual">Pansexual</SelectItem>
                    <SelectItem value="asexual">Asexual</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                    <SelectItem value="prefer-not-to-say">Prefer Not to Say</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="occupation">Occupation *</Label>
                <Input
                  id="occupation"
                  value={demographics.occupation}
                  onChange={(e) => setDemographics({ ...demographics, occupation: e.target.value })}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="annualIncome">Annual Income *</Label>
                <Select value={demographics.annualIncome || undefined} onValueChange={(value) => setDemographics({ ...demographics, annualIncome: value })}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="<25k">Less than $25,000</SelectItem>
                    <SelectItem value="25k-50k">$25,000 - $50,000</SelectItem>
                    <SelectItem value="50k-75k">$50,000 - $75,000</SelectItem>
                    <SelectItem value="75k-100k">$75,000 - $100,000</SelectItem>
                    <SelectItem value="100k-150k">$100,000 - $150,000</SelectItem>
                    <SelectItem value="150k+">$150,000+</SelectItem>
                    <SelectItem value="prefer-not-to-say">Prefer Not to Say</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-8 flex justify-end">
              <Button onClick={handleNext} variant="neon" size="lg">
                Continue to Questions
              </Button>
            </div>
          </GlowCard>
        )}

        {/* Step 2: Personality & Values (Likert Scale) */}
        {step === 2 && (
          <GlowCard className="p-8">
            <h2 className="text-2xl font-display font-bold mb-2">Section 1: Personality & Values</h2>
            <p className="text-muted-foreground mb-8">
              Rate each statement based on how strongly you agree or disagree.
            </p>
            <div className="space-y-6">
              {likertQuestions.map((question, index) => (
                <div 
                  key={question.id} 
                  className="p-4 rounded-lg bg-card/50 border border-border/50"
                >
                  <Label className="text-base block mb-4">
                    {index + 1}. {question.text}
                  </Label>
                  <RadioGroup
                    value={likertResponses[question.id]?.toString() || ""}
                    onValueChange={(value) =>
                      setLikertResponses({ ...likertResponses, [question.id]: parseInt(value) })
                    }
                    className="flex flex-wrap gap-2"
                  >
                    {likertOptions.map((option) => (
                      <div key={option.value} className="flex items-center">
                        <RadioGroupItem
                          value={option.value.toString()}
                          id={`likert-${question.id}-${option.value}`}
                          className="sr-only"
                        />
                        <Label
                          htmlFor={`likert-${question.id}-${option.value}`}
                          className={`px-3 py-2 rounded-lg border cursor-pointer transition-colors text-sm ${
                            likertResponses[question.id] === option.value
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background border-border hover:bg-muted"
                          }`}
                        >
                          {option.value} - {option.label}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              ))}
            </div>
            <div className="mt-8 flex justify-between">
              <Button onClick={() => setStep(1)} variant="outline" size="lg">
                Back
              </Button>
              <Button onClick={handleNext} variant="neon" size="lg">
                Continue
              </Button>
            </div>
          </GlowCard>
        )}

        {/* Step 3: Short Answer / Open-Ended */}
        {step === 3 && (
          <GlowCard className="p-8">
            <h2 className="text-2xl font-display font-bold mb-2">Section 2: Short Answer</h2>
            <p className="text-muted-foreground mb-8">
              Tell us more about yourself so we can find your perfect matches.
            </p>
            <div className="space-y-6">
              {openEndedQuestions.map(renderQuestion)}
            </div>
            <div className="mt-8 flex justify-between">
              <Button onClick={() => setStep(2)} variant="outline" size="lg">
                Back
              </Button>
              <Button onClick={handleNext} variant="neon" size="lg">
                Continue
              </Button>
            </div>
          </GlowCard>
        )}

        {/* Step 4: Preferences & Logistics */}
        {step === 4 && (
          <GlowCard className="p-8">
            <h2 className="text-2xl font-display font-bold mb-2">Section 3: Preferences & Logistics</h2>
            <p className="text-muted-foreground mb-8">
              Help us understand your preferences for matching and communication.
            </p>
            <div className="space-y-6">
              {preferenceQuestions.map(renderQuestion)}
            </div>
            <div className="mt-8 flex justify-between">
              <Button onClick={() => setStep(3)} variant="outline" size="lg">
                Back
              </Button>
              <Button onClick={handleSubmit} variant="neon" size="lg">
                Complete Quiz
              </Button>
            </div>
          </GlowCard>
        )}
      </div>
    </div>
  );
};

export default Quiz;

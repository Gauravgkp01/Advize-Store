import { useState } from "react";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import * as z from "zod";
import { Store, Phone, ArrowRight, ArrowLeft, MapPin, Loader2, Link2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { StepIndicator } from "@/components/StepIndicator";
import { useToast } from "@/hooks/use-toast";
import { createStore } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

const formSchema = z.object({
  businessName: z.string().min(2, { message: "Business name must be at least 2 characters." }),
  category: z.string().min(1, { message: "Please enter what you are selling." }),
  whatsapp: z.string().min(10, { message: "Please enter a valid phone number." }),
  shopLocation: z.string().min(3, { message: "Please enter your shop location." }),
});

const TOTAL_STEPS = 4;

function toHandle(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30);
}

function toHandleWithSuffix(name: string): string {
  const base = toHandle(name).slice(0, 25);
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `${base}-${suffix}`;
}

export function OnboardingPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      businessName: "",
      category: "",
      whatsapp: "",
      shopLocation: "",
    },
  });

  const businessName = useWatch({ control: form.control, name: "businessName" });
  const previewSlug = toHandle(businessName);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    const baseSlug = toHandle(values.businessName);
    try {
      const store = await createStore({
        name: values.businessName,
        slug: baseSlug,
        whatsapp: values.whatsapp,
        category: values.category,
        location: values.shopLocation,
        owner_id: user?.uid ?? null,
      } as any);

      localStorage.setItem("shop_store_id", store.id);
      localStorage.setItem("shop_store_slug", store.slug);

      toast({
        title: "Store Created!",
        description: `Welcome to Advize Store, ${values.businessName}! Your store is ready.`,
      });
      setLocation("/dashboard");
    } catch (e: any) {
      const msg = e.message ?? "Please try again.";
      if (msg.toLowerCase().includes("slug") || msg.toLowerCase().includes("taken")) {
        // Auto-retry with a random suffix — no user action needed
        try {
          const fallbackSlug = toHandleWithSuffix(values.businessName);
          const store = await createStore({
            name: values.businessName,
            slug: fallbackSlug,
            whatsapp: values.whatsapp,
            category: values.category,
            location: values.shopLocation,
            owner_id: user?.uid ?? null,
          } as any);

          localStorage.setItem("shop_store_id", store.id);
          localStorage.setItem("shop_store_slug", store.slug);

          toast({
            title: "Store Created!",
            description: `Welcome to Advize Store, ${values.businessName}! Your store is ready.`,
          });
          setLocation("/dashboard");
        } catch (e2: any) {
          toast({
            variant: "destructive",
            title: "Could not create store",
            description: e2.message ?? "Please try again.",
          });
        }
      } else {
        toast({
          variant: "destructive",
          title: "Could not create store",
          description: msg,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = async () => {
    const fieldsToValidate =
      step === 1 ? ["businessName"] as const :
      step === 2 ? ["category"] as const :
      step === 3 ? ["whatsapp"] as const :
      ["shopLocation"] as const;

    const isStepValid = await form.trigger(fieldsToValidate);
    if (isStepValid) {
      setStep(s => Math.min(s + 1, TOTAL_STEPS));
    }
  };

  const prevStep = () => {
    setStep(s => Math.max(s - 1, 1));
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-muted/20">
      <div className="flex-1 flex flex-col max-w-md w-full mx-auto p-4 sm:p-6 justify-center">

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-2xl mb-4">
            <Store className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Let's set up your store</h1>
          <p className="text-muted-foreground mt-2">Just a few simple questions to get started.</p>
        </div>

        <div className="bg-card p-6 sm:p-8 rounded-3xl border shadow-sm">
          <StepIndicator currentStep={step} totalSteps={TOTAL_STEPS} />

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-8">

              {/* Step 1: Business Name (slug is auto-generated) */}
              <div className={step === 1 ? "block animate-in fade-in slide-in-from-right-4 space-y-5" : "hidden"}>
                <FormField
                  control={form.control}
                  name="businessName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-semibold">What is your store called?</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Store className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                          <Input
                            placeholder="e.g. Priya's Boutique"
                            className="pl-10 h-12 text-lg rounded-xl"
                            {...field}
                            data-testid="input-business-name"
                          />
                        </div>
                      </FormControl>
                      {previewSlug && (
                        <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
                          <Link2 className="h-3.5 w-3.5 shrink-0" />
                          <span>
                            Your link:{" "}
                            <span className="font-medium text-foreground">
                              store.advize.in/store/{previewSlug}
                            </span>
                          </span>
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Step 2: Category */}
              <div className={step === 2 ? "block animate-in fade-in slide-in-from-right-4" : "hidden"}>
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-semibold">What are you selling?</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Clothes, Food, Handicrafts, Electronics…"
                          className="h-12 text-lg rounded-xl"
                          data-testid="input-category"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Step 3: WhatsApp */}
              <div className={step === 3 ? "block animate-in fade-in slide-in-from-right-4" : "hidden"}>
                <FormField
                  control={form.control}
                  name="whatsapp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-semibold">Where should we send orders?</FormLabel>
                      <p className="text-sm text-muted-foreground mb-3">Enter your WhatsApp number to receive order messages directly from customers.</p>
                      <FormControl>
                        <div className="relative">
                          <Phone className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                          <Input
                            placeholder="+91 98765 43210"
                            type="tel"
                            className="pl-10 h-12 text-lg rounded-xl"
                            {...field}
                            data-testid="input-whatsapp"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Step 4: Shop Location */}
              <div className={step === 4 ? "block animate-in fade-in slide-in-from-right-4" : "hidden"}>
                <FormField
                  control={form.control}
                  name="shopLocation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-base font-semibold">Where is your shop located?</FormLabel>
                      <p className="text-sm text-muted-foreground mb-3">Your location will be shown on every product so customers know where to find you.</p>
                      <FormControl>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                          <Input
                            placeholder="e.g. Bandra West, Mumbai"
                            className="pl-10 h-12 text-lg rounded-xl"
                            {...field}
                            data-testid="input-shop-location"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex gap-3 pt-4">
                {step > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 w-12 rounded-xl shrink-0"
                    onClick={prevStep}
                    data-testid="btn-prev-step"
                    disabled={isSubmitting}
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                )}

                {step < TOTAL_STEPS ? (
                  <Button
                    type="button"
                    className="flex-1 h-12 rounded-xl text-lg"
                    onClick={nextStep}
                    data-testid="btn-next-step"
                  >
                    Continue <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    className="flex-1 h-12 rounded-xl text-lg shadow-md hover:shadow-lg"
                    disabled={isSubmitting}
                    data-testid="btn-submit-store"
                  >
                    {isSubmitting ? (
                      <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Creating...</>
                    ) : (
                      "Create My Store"
                    )}
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}

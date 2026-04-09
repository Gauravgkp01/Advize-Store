import { useState } from "react";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Store, Tag, Phone, ArrowRight, ArrowLeft } from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StepIndicator } from "@/components/StepIndicator";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  businessName: z.string().min(2, { message: "Business name must be at least 2 characters." }),
  category: z.string().min(1, { message: "Please select a category." }),
  whatsapp: z.string().min(10, { message: "Please enter a valid phone number." }),
});

export function OnboardingPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(1);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      businessName: "",
      category: "",
      whatsapp: "",
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (step < 3) {
      setStep(step + 1);
      return;
    }
    
    // Final submit
    toast({
      title: "Store Created!",
      description: `Welcome to Shop, ${values.businessName}!`,
    });
    setLocation("/dashboard");
  };

  const nextStep = async () => {
    const fieldsToValidate = 
      step === 1 ? ["businessName"] as const : 
      step === 2 ? ["category"] as const : 
      ["whatsapp"] as const;
      
    const isStepValid = await form.trigger(fieldsToValidate);
    if (isStepValid) {
      setStep(s => Math.min(s + 1, 3));
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
          <StepIndicator currentStep={step} totalSteps={3} />

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 mt-8">
              
              {/* Step 1: Business Name */}
              <div className={step === 1 ? "block animate-in fade-in slide-in-from-right-4" : "hidden"}>
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
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-12 text-lg rounded-xl" data-testid="select-category">
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="fashion">Fashion & Clothing</SelectItem>
                          <SelectItem value="food">Food & Beverages</SelectItem>
                          <SelectItem value="electronics">Electronics</SelectItem>
                          <SelectItem value="crafts">Handicrafts</SelectItem>
                          <SelectItem value="beauty">Beauty & Cosmetics</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
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

              <div className="flex gap-3 pt-4">
                {step > 1 && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="h-12 w-12 rounded-xl shrink-0" 
                    onClick={prevStep}
                    data-testid="btn-prev-step"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                )}
                
                {step < 3 ? (
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
                    data-testid="btn-submit-store"
                  >
                    Create My Store
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

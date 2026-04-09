import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { ArrowLeft, ImagePlus, Loader2 } from "lucide-react";

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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Navbar } from "@/components/Navbar";

const formSchema = z.object({
  name: z.string().min(2, { message: "Product name is required." }),
  price: z.coerce.number().min(1, { message: "Price must be greater than 0." }),
  units: z.coerce.number().int().min(0, { message: "Units cannot be negative." }),
  description: z.string().min(10, { message: "Add a short description." }),
});

export function AddProductPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      price: undefined,
      units: 1,
      description: "",
    },
  });

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Mock image upload by creating a local object URL
      const url = URL.createObjectURL(file);
      setPreviewImage(url);
    }
  };

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    
    // Mock API call
    setTimeout(() => {
      toast({
        title: "Product saved!",
        description: `${values.name} has been added to your store.`,
      });
      setLocation("/dashboard");
    }, 800);
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-muted/10">
      <Navbar />
      
      <main className="flex-1 container max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <Button 
          variant="ghost" 
          className="mb-6 pl-0 hover:bg-transparent text-muted-foreground hover:text-foreground"
          onClick={() => setLocation("/dashboard")}
          data-testid="btn-back"
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Dashboard
        </Button>

        <div className="bg-card p-6 sm:p-8 rounded-3xl border shadow-sm">
          <h1 className="text-2xl font-bold mb-6">Add New Product</h1>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              {/* Image Upload Mock */}
              <div className="space-y-2">
                <label className="text-base font-semibold">Product Image</label>
                <div 
                  className="border-2 border-dashed border-muted-foreground/20 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-muted/50 transition-colors h-48 relative overflow-hidden"
                  onClick={handleImageClick}
                  data-testid="upload-image-area"
                >
                  {previewImage ? (
                    <img src={previewImage} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <>
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3 text-primary">
                        <ImagePlus className="h-6 w-6" />
                      </div>
                      <p className="font-medium">Tap to upload image</p>
                      <p className="text-sm text-muted-foreground mt-1">JPEG, PNG up to 5MB</p>
                    </>
                  )}
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                </div>
              </div>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold">Product Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Handwoven Cotton Scarf" className="h-12 rounded-xl" {...field} data-testid="input-product-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold">Price (₹)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-4 top-3 text-muted-foreground">₹</span>
                        <Input type="number" placeholder="0" className="pl-8 h-12 rounded-xl" {...field} data-testid="input-product-price" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="units"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold">Units Available</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} placeholder="e.g. 50" className="h-12 rounded-xl" {...field} data-testid="input-product-units" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base font-semibold">Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Tell your customers about this product..." 
                        className="min-h-[120px] rounded-xl resize-none" 
                        {...field} 
                        data-testid="textarea-product-desc"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="pt-4 border-t">
                <Button 
                  type="submit" 
                  className="w-full h-14 rounded-xl text-lg shadow-md" 
                  disabled={isSubmitting}
                  data-testid="btn-save-product"
                >
                  {isSubmitting ? (
                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Saving...</>
                  ) : (
                    "Save Product"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </main>
    </div>
  );
}

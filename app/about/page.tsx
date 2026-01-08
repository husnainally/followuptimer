import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata = {
  title: 'About - FollowUpTimer',
  description: 'Learn about FollowUpTimer and our mission to help you never miss a follow-up',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <Button variant="ghost" asChild className="mb-8">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
        </Button>

        <div className="space-y-12">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-4">
              About FollowUpTimer
            </h1>
            <p className="text-xl text-muted-foreground">
              Never miss a follow-up again. Effortless reminders, perfectly timed.
            </p>
          </div>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Our Mission</h2>
            <p className="text-muted-foreground leading-relaxed">
              FollowUpTimer was born from the frustration of missed connections and forgotten follow-ups. 
              We believe that maintaining relationships shouldn't be a burden. Our mission is to help you 
              stay consistent and build better habits without the overwhelm, so you can focus on what matters most.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">What We Do</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              FollowUpTimer sits quietly in your workflow, supporting you in the background. We provide:
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    Smart Reminders
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Intelligent reminder system that adapts to your schedule and preferences, 
                    ensuring you never miss an important follow-up.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    Contact Management
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Organize and track your contacts with ease, keeping all your important 
                    relationships in one place.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    Flexible Notifications
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Customize how and when you receive notifications, with support for 
                    email, push notifications, and in-app alerts.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    Privacy First
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Your data is yours. We prioritize your privacy and security, 
                    ensuring your information is protected at all times.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Why Choose FollowUpTimer?</h2>
            <p className="text-muted-foreground leading-relaxed">
              Unlike other reminder apps, FollowUpTimer is designed to be unobtrusive yet powerful. 
              We understand that you have enough on your plate, so we've built a tool that works 
              seamlessly in the background, helping you maintain relationships without adding to 
              your cognitive load.
            </p>
          </section>

          <section className="pt-8 border-t">
            <h2 className="text-2xl font-semibold mb-4">Get Started</h2>
            <p className="text-muted-foreground mb-6">
              Ready to never miss a follow-up again? Join thousands of users who trust FollowUpTimer 
              to keep their relationships strong.
            </p>
            <div className="flex gap-4">
              <Button asChild>
                <Link href="/signup">Sign Up Free</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/contact">Contact Us</Link>
              </Button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}


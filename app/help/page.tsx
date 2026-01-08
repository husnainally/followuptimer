import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ArrowLeft, Book, HelpCircle, MessageCircle, Search } from 'lucide-react';

export const metadata = {
  title: 'Help & FAQ - FollowUpTimer',
  description: 'Find answers to common questions and learn how to use FollowUpTimer',
};

const faqCategories = [
  {
    title: 'Getting Started',
    icon: Book,
    questions: [
      {
        question: 'How do I create my first reminder?',
        answer: 'To create your first reminder, navigate to the Reminders page and click the "Create Reminder" button. Fill in the contact information, set the follow-up date and time, and add any notes. Click "Save" to create your reminder.',
      },
      {
        question: 'How do I add a contact?',
        answer: 'Go to the Contacts page and click "Add Contact". Enter the contact\'s name, email, and any other relevant information. You can also add contacts directly when creating a reminder.',
      },
      {
        question: 'What types of notifications can I receive?',
        answer: 'You can receive notifications via email, push notifications (if enabled), and in-app notifications. You can customize your notification preferences in the Settings page.',
      },
    ],
  },
  {
    title: 'Account & Billing',
    icon: HelpCircle,
    questions: [
      {
        question: 'How do I upgrade my plan?',
        answer: 'Navigate to the Settings page and click on "Plan Settings" or visit the Upgrade page. Choose the plan that best fits your needs and follow the payment instructions.',
      },
      {
        question: 'Can I cancel my subscription?',
        answer: 'Yes, you can cancel your subscription at any time from the Settings page. Your subscription will remain active until the end of the current billing period.',
      },
      {
        question: 'What payment methods do you accept?',
        answer: 'We accept all major credit cards and debit cards. Payments are processed securely through Stripe.',
      },
    ],
  },
  {
    title: 'Features & Usage',
    icon: Search,
    questions: [
      {
        question: 'How does the smart snooze feature work?',
        answer: 'Smart snooze learns from your behavior and suggests optimal times to reschedule reminders. It considers your past interactions, preferred times, and patterns to help you stay on track.',
      },
      {
        question: 'Can I customize reminder tones?',
        answer: 'Yes! In Settings, go to "Tone Settings" to customize the tone and style of your reminders. You can choose from different options that match your preferences.',
      },
      {
        question: 'What are affirmations?',
        answer: 'Affirmations are positive messages that appear when you complete follow-ups. They help reinforce good habits and provide motivation to stay consistent.',
      },
      {
        question: 'How do I manage my notification preferences?',
        answer: 'Go to Settings and click on "Notification Settings". Here you can enable or disable different types of notifications, set quiet hours, and customize how you receive reminders.',
      },
    ],
  },
  {
    title: 'Troubleshooting',
    icon: MessageCircle,
    questions: [
      {
        question: 'I\'m not receiving notifications. What should I do?',
        answer: 'First, check your notification settings in Settings > Notification Settings. Make sure notifications are enabled and check your browser\'s notification permissions. For push notifications, ensure you\'ve granted permission when prompted.',
      },
      {
        question: 'How do I reset my password?',
        answer: 'Go to the Login page and click "Forgot Password". Enter your email address and you\'ll receive instructions to reset your password.',
      },
      {
        question: 'Can I export my data?',
        answer: 'Yes, you can export your contacts and reminders. Go to Settings > Privacy Settings to find the data export option.',
      },
      {
        question: 'The app seems slow. What can I do?',
        answer: 'Try refreshing the page, clearing your browser cache, or checking your internet connection. If the issue persists, contact our support team.',
      },
    ],
  },
];

export default function HelpPage() {
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
              Help & FAQ
            </h1>
            <p className="text-xl text-muted-foreground">
              Find answers to common questions and learn how to get the most out of FollowUpTimer
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Book className="h-5 w-5 text-primary" />
                  Getting Started Guide
                </CardTitle>
                <CardDescription>
                  New to FollowUpTimer? Start here
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Learn the basics of creating reminders, managing contacts, and setting up notifications.
                </p>
                <Button variant="outline" asChild>
                  <Link href="/dashboard">Go to Dashboard</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-primary" />
                  Still Need Help?
                </CardTitle>
                <CardDescription>
                  Can't find what you're looking for?
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Our support team is ready to help you with any questions or issues.
                </p>
                <Button variant="outline" asChild>
                  <Link href="/contact">Contact Support</Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-8">
            {faqCategories.map((category) => {
              const Icon = category.icon;
              return (
                <div key={category.title}>
                  <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
                    <Icon className="h-6 w-6 text-primary" />
                    {category.title}
                  </h2>
                  <Accordion type="single" collapsible className="w-full">
                    {category.questions.map((faq, index) => (
                      <AccordionItem key={index} value={`item-${category.title}-${index}`}>
                        <AccordionTrigger>{faq.question}</AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">
                          {faq.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              );
            })}
          </div>

          <div className="pt-8 border-t">
            <h2 className="text-2xl font-semibold mb-4">Additional Resources</h2>
            <div className="grid gap-4 md:grid-cols-3">
              <Button variant="outline" asChild>
                <Link href="/about">About Us</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/privacy">Privacy Policy</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/terms">Terms of Service</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


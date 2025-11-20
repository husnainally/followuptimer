import { Avatar, AvatarImage } from '@/components/ui/avatar';
import { WaitlistForm } from '@/components/waitlist-form';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function WaitlistPage() {
  return (
    <div className='min-h-screen flex flex-col'>
      {/* Header */}
      <header className='p-6'>
        <Link href='/'>
          <Button variant='ghost' size='sm' className='gap-2'>
            <ArrowLeft className='w-4 h-4' />
            Back to Home
          </Button>
        </Link>
      </header>

      {/* Main Content */}
      <section className='flex-1 flex flex-col items-center justify-center px-4 py-16'>
        <div className='w-full max-w-2xl mx-auto text-center space-y-8'>
          <div className='space-y-4'>
            <h1 className='text-5xl md:text-7xl font-bold tracking-tight'>
              Join the Waitlist
            </h1>
            <p className='text-lg md:text-xl text-muted-foreground max-w-xl mx-auto'>
              Be the first to experience smart reminders with motivational
              affirmations. Get early access when we launch.
            </p>
          </div>

          <div className='flex justify-center py-4'>
            <WaitlistForm />
          </div>

          {/* Social Proof */}
          <div className='flex flex-col items-center gap-3 pt-8'>
            <div className='flex items-center gap-2'>
              <span className='inline-flex items-center -space-x-2.5'>
                {Array.from({ length: 6 }).map((_, index) => (
                  <Avatar
                    key={index}
                    className='size-8 border-2 border-background'
                  >
                    <AvatarImage
                      src={`https://deifkwefumgah.cloudfront.net/shadcnblocks/block/guri3/avatar${
                        index + 1
                      }.png`}
                      alt={`User ${index + 1}`}
                    />
                  </Avatar>
                ))}
              </span>
              <p className='text-sm text-muted-foreground font-medium'>
                +1,000 people already joined
              </p>
            </div>
          </div>

          {/* Features Preview */}
          <div className='grid grid-cols-1 md:grid-cols-3 gap-6 pt-12'>
            <div className='space-y-2'>
              <div className='text-4xl'>⏰</div>
              <h3 className='font-semibold'>Smart Reminders</h3>
              <p className='text-sm text-muted-foreground'>
                Schedule reminders with precision timing
              </p>
            </div>
            <div className='space-y-2'>
              <div className='text-4xl'>💬</div>
              <h3 className='font-semibold'>Affirmations</h3>
              <p className='text-sm text-muted-foreground'>
                Get motivated with every reminder
              </p>
            </div>
            <div className='space-y-2'>
              <div className='text-4xl'>📧</div>
              <h3 className='font-semibold'>Multi-Channel</h3>
              <p className='text-sm text-muted-foreground'>
                Email, push, and in-app notifications
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

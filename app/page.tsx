import { Avatar, AvatarImage } from '@/components/ui/avatar';

import { WaitlistForm } from '@/components/waitlist-form';

const Waitlist1 = () => {
  return (
    <section className='flex flex-col min-h-screen w-screen items-center justify-center overflow-hidden py-32 px-4'>
      <h2 className='relative z-20 py-2 text-center font-sans text-5xl font-semibold tracking-tighter md:py-10 lg:text-8xl'>
        Join the Waitlist
      </h2>
      <p className='text-md text-muted-foreground mx-auto max-w-xl text-center lg:text-lg'>
        Stay tuned for updates and be the first to know when we launch. We're
        working hard to bring you the best experience possible.
      </p>
      <div className='mt-10 flex w-full p-4 flex-col justify-center items-center'>
        <WaitlistForm />
      </div>
      <div className='mt-10 flex items-center gap-2'>
        <span className='inline-flex items-center -space-x-2.5'>
          {Array.from({ length: 6 }).map((_, index) => (
            <Avatar key={index} className='size-8'>
              <AvatarImage
                src={`https://deifkwefumgah.cloudfront.net/shadcnblocks/block/guri3/avatar${
                  index + 1
                }.png`}
                alt={`User ${index + 1}`}
              />
            </Avatar>
          ))}
        </span>
        <p className='text-muted-foreground/80 tracking-tight'>
          +1000 people already joined
        </p>
      </div>
    </section>
  );
};

export default Waitlist1;

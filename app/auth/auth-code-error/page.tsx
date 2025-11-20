export default function AuthCodeError() {
  return (
    <div className='flex min-h-screen items-center justify-center p-4'>
      <div className='w-full max-w-md space-y-4 text-center'>
        <h1 className='text-2xl font-bold'>Authentication Error</h1>
        <p className='text-muted-foreground'>
          There was a problem confirming your signup. Please try the
          confirmation link again.
        </p>
        <a href='/login' className='inline-block text-primary hover:underline'>
          Return to login
        </a>
      </div>
    </div>
  );
}

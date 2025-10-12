import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '~/components/ui/dialog';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';

export function TestFormDialog() {
  const [open, setOpen] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [testValue, setTestValue] = useState('');

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('FORM SUBMIT FIRED!', testValue);
    setFormSubmitted(true);
    alert('Form submitted! Value: ' + testValue);
  };

  const handleButtonClick = () => {
    console.log('BUTTON CLICK FIRED!', testValue);
    alert('Button clicked! Value: ' + testValue);
  };

  return (
    <div className="p-8">
      <Button onClick={() => setOpen(true)}>Open Test Dialog</Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Form Test</DialogTitle>
            <DialogDescription>Testing form submission in Dialog</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleFormSubmit}>
            <Input
              type="text"
              value={testValue}
              onChange={(e) => setTestValue(e.target.value)}
              placeholder="Type something..."
              className="mb-4"
            />

            <div className="flex gap-4">
              <Button type="submit">
                Submit Form (type="submit")
              </Button>
              <Button type="button" onClick={handleButtonClick}>
                Click Button (onClick)
              </Button>
            </div>

            {formSubmitted && (
              <div className="mt-4 p-2 bg-green-100 text-green-800 rounded">
                Form submitted successfully!
              </div>
            )}
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

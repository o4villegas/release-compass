import { Link } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { Button } from '~/components/ui/button';

interface BackButtonProps {
  to: string;
  label?: string;
}

export function BackButton({ to, label = 'Back' }: BackButtonProps) {
  return (
    <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2">
      <Link to={to}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        {label}
      </Link>
    </Button>
  );
}

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Lock } from 'lucide-react';
import { toast } from 'sonner';

export default function LoginPage() {
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsLoading(true);

    try {
      const validPassword = 'trading123'; // Fixed password for static site
      
      if (password === validPassword) {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('app_password', password);
        }
        toast.success('Acceso autorizado');
        if (typeof window !== 'undefined') {
          window.location.href = '/dashboard/';
        }
      } else {
        toast.error('Contraseña incorrecta');
      }
    } catch (error) {
      toast.error('Error de autenticación');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-green-100 p-3 rounded-full">
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Trading Manager</CardTitle>
          <CardDescription>
            Gestión Personal de Trading
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Contraseña de Acceso
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ingresa tu contraseña"
                  className="pl-10"
                  required
                />
              </div>
            </div>
            <Button 
              type="submit" 
              className="w-full bg-green-600 hover:bg-green-700" 
              disabled={isLoading}
            >
              {isLoading ? 'Verificando...' : 'Acceder'}
            </Button>
          </form>
          <div className="mt-6 text-center text-xs text-gray-500">
            <p>Aplicación personal - Zona horaria: Europe/Madrid</p>
            <p className="mt-2 text-blue-600">Contraseña: trading123</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
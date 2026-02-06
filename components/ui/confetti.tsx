'use client';

/**
 * Confetti Component
 *
 * A lightweight confetti animation for success celebrations.
 * Uses Canvas for performance and supports custom colors.
 */

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface ConfettiProps {
  /** Whether to show the confetti */
  isActive?: boolean;
  /** Number of confetti particles */
  particleCount?: number;
  /** Custom colors */
  colors?: string[];
  /** Duration in milliseconds */
  duration?: number;
  /** Additional class names */
  className?: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  color: string;
  size: number;
  shape: 'circle' | 'square';
  opacity: number;
}

const defaultColors = [
  '#4F46E5', // Indigo
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
];

export function Confetti({
  isActive = true,
  particleCount = 150,
  colors = defaultColors,
  duration = 3000,
  className,
}: ConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number | undefined>(undefined);
  const startTimeRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!isActive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize particles
    const initParticles = () => {
      const particles: Particle[] = [];
      for (let i = 0; i < particleCount; i++) {
        particles.push(createParticle(canvas.width, canvas.height, colors));
      }
      particlesRef.current = particles;
    };

    // Animation loop
    const animate = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update and draw particles
      particlesRef.current.forEach((particle) => {
        // Update physics
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += 0.2; // Gravity
        particle.rotation += particle.rotationSpeed;

        // Fade out near end
        if (progress > 0.7) {
          particle.opacity = 1 - (progress - 0.7) / 0.3;
        }

        // Draw particle
        ctx.save();
        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.rotation);
        ctx.globalAlpha = particle.opacity;
        ctx.fillStyle = particle.color;

        if (particle.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, particle.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(
            -particle.size / 2,
            -particle.size / 2,
            particle.size,
            particle.size
          );
        }

        ctx.restore();
      });

      // Continue animation if not complete
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    initParticles();
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, particleCount, colors, duration]);

  if (!isActive) return null;

  return (
    <canvas
      ref={canvasRef}
      className={cn('fixed inset-0 pointer-events-none z-50', className)}
      aria-hidden="true"
    />
  );
}

function createParticle(
  canvasWidth: number,
  canvasHeight: number,
  colors: string[]
): Particle {
  const size = Math.random() * 10 + 5;
  return {
    x: Math.random() * canvasWidth,
    y: -size - Math.random() * 100, // Start above screen
    vx: (Math.random() - 0.5) * 4,
    vy: Math.random() * 2 + 2,
    rotation: Math.random() * 360,
    rotationSpeed: (Math.random() - 0.5) * 10,
    color: colors[Math.floor(Math.random() * colors.length)],
    size,
    shape: Math.random() > 0.5 ? 'circle' : 'square',
    opacity: 1,
  };
}

/**
 * Confetti Cannon Component
 *
 * Bursts confetti from a specific position (like a cannon).
 */

interface ConfettiCannonProps {
  /** Whether to fire the cannon */
  fire?: boolean;
  /** Origin X position (0-100%) */
  originX?: number;
  /** Origin Y position (0-100%) */
  originY?: number;
  /** Number of particles */
  particleCount?: number;
  /** Spread angle in degrees */
  spread?: number;
  /** Colors */
  colors?: string[];
  /** Additional class names */
  className?: string;
}

export function ConfettiCannon({
  fire = true,
  originX = 50,
  originY = 100,
  particleCount = 100,
  spread = 90,
  colors = defaultColors,
  className,
}: ConfettiCannonProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number | undefined>(undefined);
  const hasFiredRef = useRef(false);

  useEffect(() => {
    if (!fire || hasFiredRef.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    hasFiredRef.current = true;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Create particles from origin
    const originXPx = (originX / 100) * canvas.width;
    const originYPx = (originY / 100) * canvas.height;

    const initParticles = () => {
      const particles: Particle[] = [];
      const angleRad = (spread * Math.PI) / 180;
      const startAngle = -Math.PI / 2 - angleRad / 2;

      for (let i = 0; i < particleCount; i++) {
        const angle = startAngle + Math.random() * angleRad;
        const velocity = Math.random() * 15 + 10;

        particles.push({
          x: originXPx,
          y: originYPx,
          vx: Math.cos(angle) * velocity,
          vy: Math.sin(angle) * velocity,
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 15,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: Math.random() * 10 + 5,
          shape: Math.random() > 0.5 ? 'circle' : 'square',
          opacity: 1,
        });
      }
      particlesRef.current = particles;
    };

    let startTime: number | null = null;
    const duration = 4000;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current.forEach((particle) => {
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += 0.3; // Gravity
        particle.vx *= 0.99; // Air resistance
        particle.rotation += particle.rotationSpeed;

        if (progress > 0.6) {
          particle.opacity = 1 - (progress - 0.6) / 0.4;
        }

        ctx.save();
        ctx.translate(particle.x, particle.y);
        ctx.rotate((particle.rotation * Math.PI) / 180);
        ctx.globalAlpha = particle.opacity;
        ctx.fillStyle = particle.color;

        if (particle.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, particle.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(
            -particle.size / 2,
            -particle.size / 2,
            particle.size,
            particle.size
          );
        }

        ctx.restore();
      });

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    initParticles();
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [fire, originX, originY, particleCount, spread, colors]);

  if (!fire) return null;

  return (
    <canvas
      ref={canvasRef}
      className={cn('fixed inset-0 pointer-events-none z-50', className)}
      aria-hidden="true"
    />
  );
}

/**
 * Success Celebration Component
 *
 * Combines confetti with a success message.
 */

interface SuccessCelebrationProps {
  title?: string;
  message?: string;
  achievements?: string[];
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function SuccessCelebration({
  title = 'Congratulations!',
  message = "You've completed the onboarding!",
  achievements = [],
  action,
  className,
}: SuccessCelebrationProps) {
  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center p-4',
        className
      )}
    >
      {/* Confetti background */}
      <ConfettiCannon fire={true} />

      {/* Success card */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full text-center animate-bounce-in">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 mb-6">
          <svg
            className="w-10 h-10 text-green-600 dark:text-green-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {title}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">{message}</p>

        {achievements.length > 0 && (
          <div className="text-left mb-6">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              You accomplished:
            </h3>
            <ul className="space-y-2">
              {achievements.map((achievement, index) => (
                <li
                  key={index}
                  className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"
                >
                  <svg
                    className="w-4 h-4 text-green-500 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {achievement}
                </li>
              ))}
            </ul>
          </div>
        )}

        {action && (
          <button
            onClick={action.onClick}
            className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors"
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
}

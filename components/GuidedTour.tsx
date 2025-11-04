import React, { useEffect, useState, useLayoutEffect } from 'react';
import { XIcon, ArrowRightIcon } from './icons';

export interface TourStep {
    targetId: string;
    title: string;
    content: string;
    page?: string;
    placement?: 'top' | 'bottom' | 'left' | 'right' | 'center';
    action?: () => void;
    customContent?: () => React.ReactNode;
}

interface GuidedTourProps {
    isOpen: boolean;
    steps: TourStep[];
    currentStepIndex: number;
    onNext: () => void;
    onPrev: () => void;
    onFinish: () => void;
}

interface Position {
    top: number;
    left: number;
    width: number;
    height: number;
}

export const GuidedTour: React.FC<GuidedTourProps> = ({
    isOpen,
    steps,
    currentStepIndex,
    onNext,
    onPrev,
    onFinish
}) => {
    const [targetRect, setTargetRect] = useState<Position | null>(null);

    const step = steps[currentStepIndex];

    useLayoutEffect(() => {
        if (!isOpen || !step) return;

        const updatePosition = () => {
            if (step.placement === 'center') {
                setTargetRect(null);
                return;
            }

            const element = document.getElementById(step.targetId);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Timeout to wait for scroll to finish
                setTimeout(() => {
                     const rect = element.getBoundingClientRect();
                     setTargetRect({
                        top: rect.top,
                        left: rect.left,
                        width: rect.width,
                        height: rect.height
                    });
                }, 300);
            } else {
                 setTargetRect(null); // Hide highlight if element not found
            }
        };

        updatePosition();
        
        // Add a listener to reposition on scroll/resize
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition);
        
        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition);
        }

    }, [isOpen, step]);

    if (!isOpen || !step) return null;

    const getTooltipPosition = (): React.CSSProperties => {
        if (!targetRect) { // Center positioning
             return {
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
            };
        }
        
        const placement = step.placement || 'bottom';
        const offset = 12;

        switch(placement) {
            case 'top':
                return { top: targetRect.top - offset, left: targetRect.left + targetRect.width / 2, transform: 'translate(-50%, -100%)' };
            case 'bottom':
                return { top: targetRect.top + targetRect.height + offset, left: targetRect.left + targetRect.width / 2, transform: 'translate(-50%, 0)' };
            case 'left':
                 return { top: targetRect.top + targetRect.height / 2, left: targetRect.left - offset, transform: 'translate(-100%, -50%)' };
            case 'right':
                return { top: targetRect.top + targetRect.height / 2, left: targetRect.left + targetRect.width + offset, transform: 'translate(0, -50%)' };
            default:
                return { top: targetRect.top + targetRect.height + offset, left: targetRect.left };
        }
    };
    
    return (
        <div className="tour-overlay animate-fade-in" onClick={onFinish}>
            {targetRect && (
                <div
                    className="tour-highlight"
                    style={{
                        top: `${targetRect.top - 4}px`,
                        left: `${targetRect.left - 4}px`,
                        width: `${targetRect.width + 8}px`,
                        height: `${targetRect.height + 8}px`,
                    }}
                />
            )}
            <div
                className="tour-tooltip animate-fade-in"
                style={getTooltipPosition()}
                onClick={e => e.stopPropagation()}
            >
                {step.customContent ? step.customContent() : (
                    <>
                        <h3 className="text-lg font-bold text-white mb-2">{step.title}</h3>
                        <p className="text-sm">{step.content}</p>
                    </>
                )}
               
                <footer className="flex justify-between items-center mt-4 pt-4 border-t border-gray-700">
                    <span className="text-xs text-gray-400">
                        {currentStepIndex + 1} / {steps.length}
                    </span>
                    <div className="flex gap-2">
                        {currentStepIndex > 0 && (
                             <button onClick={onPrev} className="px-3 py-1.5 text-xs bg-gray-600 rounded-md hover:bg-gray-500 transition-colors">
                                Назад
                            </button>
                        )}
                        <button onClick={onNext} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-cyan-600 text-white rounded-md hover:bg-cyan-500 transition-colors">
                            {currentStepIndex === steps.length - 1 ? 'Завершить' : 'Далее'}
                            {currentStepIndex < steps.length - 1 && <ArrowRightIcon className="w-3 h-3"/>}
                        </button>
                    </div>
                </footer>

                 <button onClick={onFinish} className="absolute top-2 right-2 p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white">
                    <XIcon className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};

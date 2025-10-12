import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepFormProps {
  steps: {
    id: string;
    title: string;
    description?: string;
    icon?: React.ReactNode;
    content: React.ReactNode;
    validation?: () => boolean;
  }[];
  onComplete: () => void;
  onCancel?: () => void;
  submitButtonText?: string;
  isSubmitting?: boolean;
}

export function StepForm({
  steps,
  onComplete,
  onCancel,
  submitButtonText = "Concluir",
  isSubmitting = false
}: StepFormProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const handleNext = () => {
    const currentStepData = steps[currentStep];
    if (!currentStepData) return;
    
    const currentValidation = currentStepData.validation;
    if (currentValidation && !currentValidation()) {
      return;
    }
    
    setCompletedSteps(prev => new Set([...prev, currentStep]));
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (index: number) => {
    // Only allow navigation to previously completed steps or the next step
    if (index <= currentStep || completedSteps.has(index)) {
      setCurrentStep(index);
    }
  };

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 1000 : -1000,
      opacity: 0
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 1000 : -1000,
      opacity: 0
    })
  };

  const swipeConfidenceThreshold = 10000;
  const swipePower = (offset: number, velocity: number) => {
    return Math.abs(offset) * velocity;
  };

  return (
    <div className="w-full">
      {/* Step Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className="flex items-center cursor-pointer"
              onClick={() => handleStepClick(index)}
            >
              <div
                className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300",
                  index === currentStep
                    ? "bg-primary text-primary-foreground border-primary scale-110"
                    : completedSteps.has(index)
                    ? "bg-green-500 text-white border-green-500"
                    : "bg-gray-100 text-gray-400 border-gray-300"
                )}
              >
                {completedSteps.has(index) && index !== currentStep ? (
                  <Check className="w-5 h-5" />
                ) : step.icon ? (
                  step.icon
                ) : (
                  <span className="text-sm font-semibold">{index + 1}</span>
                )}
              </div>
              {index < steps.length - 1 && (
                <div className="flex-1 mx-2">
                  <div
                    className={cn(
                      "h-1 transition-all duration-500 ease-out",
                      completedSteps.has(index)
                        ? "bg-green-500"
                        : "bg-gray-200"
                    )}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-4">
          {steps.map((step, index) => (
            <div
              key={`label-${step.id}`}
              className={cn(
                "text-sm transition-all duration-300",
                index === currentStep
                  ? "font-semibold text-primary"
                  : completedSteps.has(index)
                  ? "text-green-600"
                  : "text-gray-400"
              )}
            >
              {step.title}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="relative min-h-[400px] overflow-hidden">
        <AnimatePresence mode="wait" custom={currentStep}>
          <motion.div
            key={currentStep}
            custom={currentStep}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 }
            }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={1}
            onDragEnd={(_e, { offset, velocity }) => {
              const swipe = swipePower(offset.x, velocity.x);

              if (swipe < -swipeConfidenceThreshold && currentStep < steps.length - 1) {
                handleNext();
              } else if (swipe > swipeConfidenceThreshold && currentStep > 0) {
                handlePrevious();
              }
            }}
          >
            <div className="space-y-4">
              {/* Step Header */}
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  {steps[currentStep]?.title || ''}
                </h3>
                {steps[currentStep]?.description && (
                  <p className="text-sm text-gray-500 mt-1">
                    {steps[currentStep].description}
                  </p>
                )}
              </div>

              {/* Step Content */}
              <div className="animate-fadeIn">
                {steps[currentStep]?.content || null}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center mt-8 pt-6 border-t">
        <div className="flex gap-2">
          {currentStep > 0 && (
            <Button
              type="button"
              variant="outline"
              onClick={handlePrevious}
              className="transition-all duration-200 hover:scale-105"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          )}
          {onCancel && (
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
            >
              Cancelar
            </Button>
          )}
        </div>
        
        <div className="flex gap-2 items-center">
          {/* Step Progress Text */}
          <span className="text-sm text-gray-500 mr-4">
            Etapa {currentStep + 1} de {steps.length}
          </span>
          
          {currentStep < steps.length - 1 ? (
            <Button
              type="button"
              onClick={handleNext}
              className="transition-all duration-200 hover:scale-105"
            >
              Próximo
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={onComplete}
              disabled={isSubmitting}
              className="transition-all duration-200 hover:scale-105 bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Processando...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  {submitButtonText}
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
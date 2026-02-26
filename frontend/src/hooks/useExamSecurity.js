import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook to implement exam security features.
 * Refactored to use Stable Callbacks (useCallback) and Ref-based Processing Lock.
 * REMOVED: All toast notifications (handled by Modal now).
 *
 * @param {Function} onAutoSubmit - Callback to trigger when violations delay limit is reached.
 * @param {Function} onWarning - Callback to handle warnings (show modal).
 * @returns {Object} handlers - Event handlers to attach to the exam container.
 */
const useExamSecurity = (onAutoSubmit, onWarning) => {
    // Source of Truth for violation count inside Event Listeners
    const violationsRef = useRef(0);
    // UI State for rendering
    const [violationCount, setViolationCount] = useState(0);

    // Termination State
    const [isTerminated, setIsTerminated] = useState(false);

    // Processing Lock (Mutex-like)
    const processingRef = useRef(false);

    // Strict Visibility Tracking (Boolean Flag)
    const isHiddenRef = useRef(false);

    // Warning Thresholds
    const MAX_VIOLATIONS = 5;

    // Persist callbacks
    const onAutoSubmitRef = useRef(onAutoSubmit);
    const onWarningRef = useRef(onWarning);

    useEffect(() => {
        onAutoSubmitRef.current = onAutoSubmit;
        onWarningRef.current = onWarning;
    }, [onAutoSubmit, onWarning]);

    // CORE LOGIC: Handle Violation
    const handleViolation = useCallback((type) => {
        // Increment Ref
        const newCount = violationsRef.current + 1;
        violationsRef.current = newCount;

        // Sync UI
        setViolationCount(newCount);

        console.log(`Exam Violation Detected (${type})! Count: ${newCount}`);

        // If already terminated, do nothing
        if (isTerminated) return;

        if (newCount < MAX_VIOLATIONS) {
            if (onWarningRef.current) {
                onWarningRef.current('tab-switch', newCount);
            }
        } else if (newCount >= MAX_VIOLATIONS) {
            // Termination Logic
            setIsTerminated(true);

            // Trigger Warning first to show Modal "Terminated" state
            if (onWarningRef.current) {
                onWarningRef.current('tab-switch', newCount);
            }

            // Trigger Auto-Submit
            if (onAutoSubmitRef.current) {
                onAutoSubmitRef.current();
            }
        }
    }, [isTerminated]);


    // 1. VISIBILITY CHANGE HANDLER
    const handleVisibilityChange = useCallback(() => {
        if (processingRef.current) return;

        if (document.hidden) {
            if (!isHiddenRef.current) {
                processingRef.current = true;
                isHiddenRef.current = true;

                handleViolation('visibility-hidden');

                setTimeout(() => {
                    processingRef.current = false;
                }, 100);
            }
        } else {
            isHiddenRef.current = false;
        }
    }, [handleViolation]);


    // 2. WINDOW BLUR HANDLER
    const handleWindowBlur = useCallback(() => {
        if (processingRef.current) return;
        if (document.hidden || isHiddenRef.current) return;

        processingRef.current = true;

        handleViolation('blur');

        setTimeout(() => {
            processingRef.current = false;
        }, 100);
    }, [handleViolation]);


    // ATTACH LISTENERS
    useEffect(() => {
        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("blur", handleWindowBlur);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("blur", handleWindowBlur);
        };
    }, [handleVisibilityChange, handleWindowBlur]);


    // 2. Fullscreen Enforcement
    const triggerFullscreen = async () => {
        try {
            if (!document.fullscreenElement) {
                if (document.documentElement.requestFullscreen) {
                    await document.documentElement.requestFullscreen();
                } else if (document.documentElement.mozRequestFullScreen) {
                    await document.documentElement.mozRequestFullScreen();
                } else if (document.documentElement.webkitRequestFullscreen) {
                    await document.documentElement.webkitRequestFullscreen();
                } else if (document.documentElement.msRequestFullscreen) {
                    await document.documentElement.msRequestFullscreen();
                }
            }
        } catch (err) {
            console.warn("Fullscreen request failed:", err);
            // No toast here intentionally
        }
    };

    // Attempt on mount
    useEffect(() => {
        triggerFullscreen();
    }, []);


    // 3. Clipboard & Context Menu Blockers
    const preventAction = useCallback((e, message) => {
        e.preventDefault();

        if (onWarningRef.current) {
            onWarningRef.current('copy-paste', violationsRef.current);
        }
    }, []);

    const securityHandlers = {
        onCopy: (e) => preventAction(e, 'Copying is disabled during the exam'),
        onCut: (e) => preventAction(e, 'Cutting is disabled during the exam'),
        onPaste: (e) => preventAction(e, 'Pasting is disabled during the exam'),
        onContextMenu: (e) => preventAction(e, 'Right-click is disabled during the exam'),
    };

    return {
        violationCount,
        isTerminated,
        securityHandlers,
        triggerFullscreen
    };
};

export default useExamSecurity;
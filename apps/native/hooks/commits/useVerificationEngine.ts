import { useState, useCallback, useMemo } from 'react';

/**
 * useVerificationEngine
 * 
 * An orchestrator hook that evaluates what evidence a task requires based on its
 * `conditions` array and provides a unified method `gatherEvidence` to execute 
 * the appropriate native sensor (GPS, Camera, etc.) sequentially.
 */
export function useVerificationEngine(event: any) {
  const [isGathering, setIsGathering] = useState(false);

  // Parse the conditions array to find exactly what evidence types we require.
  const requiredEvidenceTypes = useMemo(() => {
    if (!event?.conditions || !Array.isArray(event.conditions)) return [];
    
    // We only care about metrics that require user input/sensors for verification
    const validEvidenceKeys = ['location', 'photo', 'screentime'];
    
    return event.conditions
      .filter((c: any) => validEvidenceKeys.includes(c.metric_key))
      .map((c: any) => c.metric_key);
      
  }, [event?.conditions]);

  /**
   * Triggers the actual gathering of evidence based on the required types.
   * Prompts the user or silently reads native sensors as instructed by the conditions.
   * 
   * @returns An array of evidence payloads to be sent to the backend.
   */
  const gatherEvidence = useCallback(async (): Promise<Array<{key: string, payload: any}>> => {
    setIsGathering(true);
    const gatheredPayloads: Array<{key: string, payload: any}> = [];
    
    try {
      if (requiredEvidenceTypes.length === 0) {
        // If there are no complex conditions, returning an empty array is fine
        // The backend orchestrator will still verify schedule/status.
        return gatheredPayloads;
      }

      console.log(`[useVerificationEngine] Starting gathering sequence for types:`, requiredEvidenceTypes);

      // --- MOCK GATHERING PHASE ---
      // Here we loop through the required types and execute the native logic.
      // E.g., if 'photo' is required, we await the Camera UI promise here.
      for (const requiredType of requiredEvidenceTypes) {
        console.log(`[useVerificationEngine] Gathering evidence for: ${requiredType}...`);
        
        // Simulating native sensor loading time (e.g. acquiring GPS lock or waiting for photo capture)
        await new Promise(resolve => setTimeout(resolve, 800));

        switch (requiredType) {
          case 'location':
            // TODO: Await `ExpoLocation.getCurrentPositionAsync()`
            gatheredPayloads.push({
              key: 'location',
              payload: { lat: 12.9734, lng: 79.1647, mock: true }
            });
            break;
            
          case 'photo':
            // TODO: Await `Navigation.push("/camera")` and await the image URL
            gatheredPayloads.push({
              key: 'photo',
              payload: { url: 'https://placeholder.com/mock-photo.jpg' }
            });
            break;
            
          default:
            console.warn(`[useVerificationEngine] Unknown evidence type requested: ${requiredType}`);
            break;
        }
      }

      console.log("[useVerificationEngine] Gathering complete! Payload:", gatheredPayloads);
      return gatheredPayloads;

    } catch (error) {
       console.error("[useVerificationEngine] Gathering Failed:", error);
       throw error;
    } finally {
      setIsGathering(false);
    }
  }, [requiredEvidenceTypes]);


  return {
    requiredEvidenceTypes,
    isGathering,
    gatherEvidence,
  };
}

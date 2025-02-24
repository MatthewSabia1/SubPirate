import { ComponentType, useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { FeatureKey } from './features'
import { useFeatureAccess } from './useFeatureAccess'

export function withFeatureAccess<P extends object>(
  WrappedComponent: ComponentType<P>,
  requiredFeature: FeatureKey,
  redirectPath: string = '/upgrade'
) {
  return function WithFeatureAccessWrapper(props: P) {
    const router = useRouter()
    const { checkFeatureAccess } = useFeatureAccess()
    const [hasAccess, setHasAccess] = useState<boolean | null>(null)

    useEffect(() => {
      async function checkAccess() {
        const access = await checkFeatureAccess(requiredFeature)
        setHasAccess(access)
        
        if (!access) {
          router.push(redirectPath)
        }
      }

      checkAccess()
    }, [checkFeatureAccess, requiredFeature, router, redirectPath])

    // Show nothing while checking access
    if (hasAccess === null) {
      return null
    }

    // Only render the component if user has access
    return hasAccess ? <WrappedComponent {...props} /> : null
  }
} 
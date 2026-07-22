import { Particles } from "@/components/ui/particles"

export function HomeParticleBackground() {
  return (
    <div className="home-background home-particle-background" aria-hidden="true">
      <Particles
        className="home-background-layer"
        quantity={96}
        color="#111111"
        ease={72}
        staticity={58}
      />
    </div>
  )
}

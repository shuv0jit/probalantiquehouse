import { forwardRef } from 'react';
import { MapPin, Phone } from 'lucide-react';

const AboutSection = forwardRef(function AboutSection(_, ref) {
  return (
       <section className="about reveal" ref={ref} id="about">
      <div className="about__in">
        <span className="eyebrow">About Probal Antique House</span>
        <h2 className="display">A family showroom, now online</h2>
        <p>
          Probal Antique House (City Gold) has served Joypurhat with gold, antique and fashion
          jewellery for years. Every piece here is photographed from our actual showroom shelves —
          what you see is what's in store. Note a piece's number and visit us, or message us the
          number directly to ask about it.
        </p>
        <div className="about__meta">
          <span><MapPin size={14} /> Joypurhat, Rajshahi, Bangladesh</span>
        </div>
      </div>
    </section>
  );
});

export default AboutSection;
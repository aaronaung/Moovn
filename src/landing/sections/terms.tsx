export function TermsContent() {
  return (
    <div className="prose prose-sm dark:prose-invert sm:prose-base max-w-none">
      <div className="mb-12 text-center">
        <h1 className="mb-4 text-4xl font-bold">Terms of Service</h1>
        <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
      </div>

      <div className="space-y-12">
        <section>
          <h2 className="border-b pb-2 text-2xl font-semibold">1. Agreement to Terms</h2>
          <p className="mt-4">
            By accessing or using Moovn&apos;s services, you agree to be bound by these Terms of
            Service and our Privacy Policy.
          </p>
        </section>

        <section>
          <h2 className="border-b pb-2 text-2xl font-semibold">2. Description of Service</h2>
          <p className="mt-4">
            Moovn provides automated social media content creation and scheduling services for dance
            and fitness studios, including:
          </p>
          <ul className="mt-4 list-disc space-y-2 pl-6">
            <li>Design generation from templates</li>
            <li>Schedule integration with Mindbody and Pike13</li>
            <li>Instagram publishing and scheduling</li>
            <li>Google Drive integration</li>
          </ul>
        </section>

        <section>
          <h2 className="border-b pb-2 text-2xl font-semibold">3. Account Terms</h2>
          <ul className="mt-4 list-disc space-y-2 pl-6">
            <li>You must be 18 years or older to use this service</li>
            <li>You must provide accurate and complete information</li>
            <li>You are responsible for maintaining account security</li>
            <li>You must not use the service for any illegal purposes</li>
          </ul>
        </section>

        <section>
          <h2 className="border-b pb-2 text-2xl font-semibold">4. Payment Terms</h2>
          <ul className="mt-4 list-disc space-y-2 pl-6">
            <li>Subscription fees are billed in advance</li>
            <li>All fees are non-refundable</li>
            <li>We may change our fees upon notice</li>
          </ul>
        </section>

        <section>
          <h2 className="border-b pb-2 text-2xl font-semibold">5. Content Guidelines</h2>
          <p className="mt-4">You agree not to upload, share, or create content that:</p>
          <ul className="mt-4 list-disc space-y-2 pl-6">
            <li>Infringes on intellectual property rights</li>
            <li>Contains harmful or malicious code</li>
            <li>Violates any applicable laws</li>
            <li>Contains inappropriate or offensive material</li>
          </ul>
        </section>

        <section>
          <h2 className="border-b pb-2 text-2xl font-semibold">6. Limitation of Liability</h2>
          <p className="mt-4">
            Moovn is provided &quot;as is&quot; without warranties of any kind. We are not liable
            for any damages arising from your use of the service.
          </p>
        </section>

        <section>
          <h2 className="border-b pb-2 text-2xl font-semibold">7. Termination</h2>
          <p className="mt-4">
            We may terminate or suspend your account at any time for violations of these terms. You
            may cancel your account at any time.
          </p>
        </section>

        <section>
          <h2 className="border-b pb-2 text-2xl font-semibold">8. Changes to Terms</h2>
          <p className="mt-4">
            We may modify these terms at any time. Continued use of the service constitutes
            acceptance of modified terms.
          </p>
        </section>

        <section>
          <h2 className="border-b pb-2 text-2xl font-semibold">9. Contact</h2>
          <p className="mt-4">
            For questions about these terms, please contact us at:{" "}
            <a href="mailto:team@moovn.co" className="text-primary hover:underline">
              team@moovn.co
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}

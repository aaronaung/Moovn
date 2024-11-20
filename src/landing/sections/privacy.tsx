export function PrivacyContent() {
  return (
    <div className="prose prose-sm dark:prose-invert sm:prose-base max-w-none">
      <div className="mb-12 text-center">
        <h1 className="mb-4 text-4xl font-bold">Privacy Policy</h1>
        <p className="text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
      </div>

      <div className="space-y-12">
        <section>
          <h2 className="border-b pb-2 text-2xl font-semibold">1. Introduction</h2>
          <p className="mt-4">
            At Moovn (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;), we take your privacy
            seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard
            your information when you use our service.
          </p>
        </section>

        <section>
          <h2 className="border-b pb-2 text-2xl font-semibold">2. Information We Collect</h2>
          <div className="mt-4 space-y-6">
            <div>
              <h3 className="mb-3 text-xl font-medium">2.1 Information you provide to us:</h3>
              <ul className="list-disc space-y-2 pl-6">
                <li>Account information (name, email, password)</li>
                <li>Business information (studio details, schedules)</li>
                <li>Payment information</li>
                <li>Content you upload or create using our services</li>
              </ul>
            </div>
            <div>
              <h3 className="mb-3 text-xl font-medium">
                2.2 Information we collect automatically:
              </h3>
              <ul className="list-disc space-y-2 pl-6">
                <li>Usage data</li>
                <li>Device information</li>
                <li>Log data</li>
              </ul>
            </div>
          </div>
        </section>

        <section>
          <h2 className="border-b pb-2 text-2xl font-semibold">3. How We Use Your Information</h2>
          <p className="mb-3 mt-4">We use the collected information to:</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>Provide and maintain our services</li>
            <li>Process your payments</li>
            <li>Send you important service updates</li>
            <li>Improve our services</li>
            <li>Respond to your requests and support needs</li>
          </ul>
        </section>

        <section>
          <h2 className="border-b pb-2 text-2xl font-semibold">4. Data Sharing and Disclosure</h2>
          <p className="mb-3 mt-4">We may share your information with:</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>Service providers (hosting, payment processing)</li>
            <li>Integration partners (Mindbody, Pike13, Instagram)</li>
            <li>Legal authorities when required by law</li>
          </ul>
        </section>

        <section>
          <h2 className="border-b pb-2 text-2xl font-semibold">5. Data Security</h2>
          <p className="mt-4">
            We implement appropriate security measures to protect your information. However, no
            method of transmission over the internet is 100% secure.
          </p>
        </section>

        <section>
          <h2 className="border-b pb-2 text-2xl font-semibold">6. Your Rights</h2>
          <p className="mb-3 mt-4">You have the right to:</p>
          <ul className="list-disc space-y-2 pl-6">
            <li>Access your personal information</li>
            <li>Correct inaccurate data</li>
            <li>Request deletion of your data</li>
            <li>Object to processing of your data</li>
          </ul>
        </section>

        <section>
          <h2 className="border-b pb-2 text-2xl font-semibold">7. Contact Us</h2>
          <p className="mt-4">
            For any questions about this Privacy Policy, please contact us at:{" "}
            <a href="mailto:team@moovn.co" className="text-primary hover:underline">
              team@moovn.co
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}

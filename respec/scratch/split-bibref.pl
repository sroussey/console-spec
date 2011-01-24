#!/usr/bin/perl

use strict;
use warnings;

use Path::Class qw(file);
use JSON::XS;

# conf
my $in = "/Projects/W3C/2009/dap/ReSpec.js/bibref/biblio.js";
my $out = "/Projects/W3C/2009/respec2/experimental/bibref";

# open source
# open my $IN, "<:utf8", $in or die "BOOM: $!";
# my $bib = do { local $/ = undef; <$IN>; };
# close $IN;
my $bib = file($in)->slurp();

# remove beginning
$bib =~ s/^berjon\.biblio = //;
$bib =~ s/;\s*$//;
$bib =~ s/,?\s+}$/}/;

# parse as JSON
my $data = JSON::XS->new->utf8->decode($bib);

# generate individual files
while (my ($k, $v) = each %$data) {
    open my $f, ">:utf8", "$out/$k.html" or die "OOPS! $!";
    print $f $v;
    close $f;    
}
